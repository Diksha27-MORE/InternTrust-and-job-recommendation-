const USER_KEY = 'interntrust_user'
const TOKEN_KEY = 'interntrust_token'
const SESSION_KEY = 'interntrust_session'

/* =========================================================
   PROFILE EVENT
   Lets the Dashboard refresh the moment Profile saves.
========================================================= */

export const PROFILE_UPDATED_EVENT = 'interntrust:profile-updated'

function emitProfileUpdated(user) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.dispatchEvent(
      new CustomEvent(PROFILE_UPDATED_EVENT, {
        detail: user || null,
      })
    )
  } catch {
    /* CustomEvent unsupported — safe to ignore */
  }
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

/* =========================================================
   SKILL + ROLE NORMALIZERS
========================================================= */

const STOP_WORDS = new Set([
  'and',
  'the',
  'to',
  'of',
  'a',
  'an',
  'in',
  'on',
  'for',
  'with',
  'or',
  'at',
  'by',
  'as',
  'is',
  'are',
  'be',
  'from',
  'that',
  'this',
  'it',
])

export function normalizeSkills(skills) {
  let list = skills

  if (typeof list === 'string') {
    list = list.split(/[,\n;]/)
  }

  if (!Array.isArray(list)) {
    return []
  }

  const seen = new Set()
  const cleaned = []

  list.forEach((entry) => {
    const label = String(entry ?? '').trim()

    if (!label) {
      return
    }

    const key = label.toLowerCase()

    if (STOP_WORDS.has(key) || seen.has(key)) {
      return
    }

    seen.add(key)
    cleaned.push(label)
  })

  return cleaned
}

export function getUserSkills(user) {
  const source =
    user?.skills ??
    user?.current_skills ??
    user?.currentSkills ??
    []

  return normalizeSkills(source)
}

export function getTargetRole(user) {
  // NOTE: user.role is the ACCOUNT TYPE (Student / Graduate /
  // Job Seeker). It is deliberately NOT used as a target role.
  const role =
    user?.target_role ??
    user?.targetRole ??
    user?.desired_role ??
    user?.desiredRole ??
    user?.career_goal ??
    user?.careerGoal ??
    ''

  return String(role).trim()
}

/* =========================================================
   AUTH REQUEST
========================================================= */

async function requestAuth(path, options = {}) {
  const response = await fetch(`/api/auth${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.error || 'Authentication request failed.'
    )
  }

  return data
}

/* =========================================================
   SESSION READ
========================================================= */

export function getCurrentUser() {
  const token = localStorage.getItem(TOKEN_KEY)

  const user = safeJsonParse(
    localStorage.getItem(USER_KEY),
    null
  )

  if (!token || !user?.email) {
    return null
  }

  return user
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/* =========================================================
   SESSION WRITE
========================================================= */

export function setCurrentUser(user, token) {
  if (!user || !user.email) {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)

    return null
  }

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  )

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      id: user.id,
      email: user.email,
    })
  )

  if (token) {
    localStorage.setItem(
      TOKEN_KEY,
      token
    )
  }

  return user
}

export function clearCurrentUser() {
  const token = getAuthToken()

  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)

  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {})
  }
}

/* =========================================================
   REGISTER
========================================================= */

export async function registerUser({
  name,
  email,
  password,
  role = 'Student',
}) {
  try {
    const data = await requestAuth(
      '/register',
      {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      }
    )

    return {
      success: true,
      user: data.user,
    }

  } catch (error) {

    return {
      success: false,
      error: error.message,
    }

  }
}

/* =========================================================
   LOGIN
   Career preferences (target role + skills) live only in
   the browser, so we merge the ones already saved for this
   email back in after a fresh login.
========================================================= */

function readStoredPreferences(email) {
  const stored = safeJsonParse(
    localStorage.getItem(USER_KEY),
    null
  )

  if (
    !stored ||
    String(stored.email || '').toLowerCase() !==
      String(email || '').toLowerCase()
  ) {
    return {}
  }

  const preferences = {}

  const targetRole = getTargetRole(stored)

  if (targetRole) {
    preferences.target_role = targetRole
    preferences.targetRole = targetRole
  }

  const skills = getUserSkills(stored)

  if (skills.length) {
    preferences.skills = skills
  }

  if (stored.location) {
    preferences.location = stored.location
  }

  return preferences
}

export async function loginUser({
  email,
  password,
}) {
  try {

    const preferences = readStoredPreferences(email)

    const data = await requestAuth(
      '/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      }
    )

    const user = setCurrentUser(
      {
        ...preferences,
        ...data.user,
        target_role:
          getTargetRole(data.user) ||
          preferences.target_role ||
          '',
        targetRole:
          getTargetRole(data.user) ||
          preferences.target_role ||
          '',
        skills: getUserSkills(data.user).length
          ? getUserSkills(data.user)
          : preferences.skills || [],
        history: Array.isArray(data.history)
          ? data.history
          : [],
      },
      data.token
    )

    emitProfileUpdated(user)

    return {
      success: true,
      user,
    }

  } catch (error) {

    return {
      success: false,
      error: error.message,
    }

  }
}

/* =========================================================
   UPDATE PROFILE
========================================================= */

export function updateCurrentUser(updates) {

  const currentUser = getCurrentUser()

  if (!currentUser) {
    return null
  }

  const patch = updates || {}

  const hasTargetRole =
    'target_role' in patch ||
    'targetRole' in patch ||
    'desired_role' in patch ||
    'desiredRole' in patch

  const nextTargetRole = hasTargetRole
    ? getTargetRole(patch)
    : getTargetRole(currentUser)

  const hasSkills =
    'skills' in patch ||
    'current_skills' in patch ||
    'currentSkills' in patch

  const nextSkills = hasSkills
    ? normalizeSkills(
        patch.skills ??
          patch.current_skills ??
          patch.currentSkills
      )
    : getUserSkills(currentUser)

  const updatedUser = {
    ...currentUser,
    ...patch,

    email: String(
      patch.email ||
      currentUser.email ||
      ''
    )
      .trim()
      .toLowerCase(),

    name: String(
      patch.name ||
      currentUser.name ||
      ''
    ).trim(),

    role: String(
      patch.role ||
      currentUser.role ||
      'Student'
    ).trim() || 'Student',

    // Career preferences — what the Dashboard reads
    target_role: nextTargetRole,
    targetRole: nextTargetRole,

    skills: nextSkills,

    location: String(
      patch.location ||
      currentUser.location ||
      ''
    ).trim(),

    // Never lose analysis history on a profile edit
    history: Array.isArray(patch.history)
      ? patch.history
      : Array.isArray(currentUser.history)
        ? currentUser.history
        : [],
  }

  setCurrentUser(updatedUser)

  emitProfileUpdated(updatedUser)

  return updatedUser
}

export function updateCurrentUserSkills(skills) {

  const currentUser = getCurrentUser()

  if (!currentUser) {
    return null
  }

  return updateCurrentUser({
    skills: normalizeSkills(skills),
  })
}

export function updateCareerPreferences({
  targetRole,
  skills,
  location,
}) {

  const currentUser = getCurrentUser()

  if (!currentUser) {
    return null
  }

  return updateCurrentUser({
    target_role: String(targetRole ?? '').trim(),
    skills: normalizeSkills(skills),
    location: String(
      location ?? currentUser.location ?? ''
    ).trim(),
  })
}

/* =========================================================
   HISTORY
========================================================= */

export function getCurrentUserHistory() {

  const currentUser = getCurrentUser()

  if (!currentUser) {
    return []
  }

  return Array.isArray(
    currentUser.history
  )
    ? currentUser.history
    : []
}

export function addAnalysisToCurrentUser(record) {

  const currentUser = getCurrentUser()

  if (!currentUser) {
    return null
  }

  const existingHistory =
    Array.isArray(currentUser.history)
      ? currentUser.history
      : []

  const nextHistory = [
    record,
    ...existingHistory,
  ]

  const updatedUser = {
    ...currentUser,
    history: nextHistory,
  }

  setCurrentUser(updatedUser)

  return updatedUser
}