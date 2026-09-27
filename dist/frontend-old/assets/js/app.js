/**
 * InternTrust Frontend - JavaScript Application
 */

// ============================================
// CONFIG
// ============================================

const API_URL =
    (window.location.protocol === 'file:')
        ? 'http://localhost:5000'
        : window.location.origin;

const BACKEND_TIMEOUT = 30000;

// ============================================
// APP STATE
// ============================================

let appState = {
    isLoggedIn: false,
    currentUser: null,
    userProfile: null,
    analysisHistory: [],
    recommendations: [],
    currentAnalysis: null
};

let _saveLock = false;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {

    console.log('InternTrust Frontend Initialized');

    initializeApp();

    setupEventListeners();

    loadFromLocalStorage();
});

// ============================================
// APP INIT
// ============================================

function initializeApp() {

    const token =
        sessionStorage.getItem('userToken');

    const user =
        sessionStorage.getItem('userProfile');

    if (token && user) {

        appState.isLoggedIn = true;

        appState.currentUser =
            JSON.parse(user);

        loadUserProfile();

        updateNavbarForLoggedIn();

        showPage('home');

    } else {

        appState.isLoggedIn = false;

        appState.currentUser = null;

        const navbar =
            document.getElementById('navbar');

        if (navbar)
            navbar.style.display = 'none';

        showPage('login');
    }
}

// ============================================
// NAVBAR
// ============================================

function updateNavbarForLoggedIn() {

    const navMenu =
        document.getElementById('navMenu');

    if (navMenu) {
        navMenu.style.display = 'flex';
    }
}

// ============================================
// LOCAL STORAGE
// ============================================

function loadFromLocalStorage() {

    const history =
        localStorage.getItem('analysisHistory');

    if (history) {

        appState.analysisHistory =
            JSON.parse(history);
    }
}

// ============================================
// PAGE MANAGEMENT
// ============================================

function showPage(pageName) {

    const pages =
        document.querySelectorAll('.page-content');

    pages.forEach(page =>
        page.classList.add('d-none')
    );

    const navbar =
        document.getElementById('navbar');

    if (
        ['login', 'register', 'forgot-password']
            .includes(pageName)
    ) {

        if (navbar)
            navbar.style.display = 'none';

    } else {

        if (navbar)
            navbar.style.display = 'flex';
    }

    const selectedPage =
        document.getElementById(pageName + '-page');

    if (selectedPage) {

        selectedPage.classList.remove('d-none');
    }

    if (pageName === 'home') {

        updateDashboard();

    } else if (pageName === 'history') {

        loadHistory();

    } else if (pageName === 'profile') {

        loadProfileForm();
    }
}

// ============================================
// DASHBOARD
// ============================================

function updateDashboard() {

    const checked =
        parseInt(localStorage.getItem('jobsChecked')) || 0;

    const scams =
        parseInt(localStorage.getItem('scamsDetected')) || 0;

    const safe =
        parseInt(localStorage.getItem('safeJobs')) || 0;

    const statChecked =
        document.getElementById('statChecked');

    const statScams =
        document.getElementById('statScams');

    const statSafe =
        document.getElementById('statSafe');

    if (statChecked) statChecked.textContent = checked;
    if (statScams)   statScams.textContent   = scams;
    if (statSafe)    statSafe.textContent     = safe;
}

// ============================================
// HISTORY
// ============================================

function loadHistory() {

    const historyContent =
        document.getElementById('historyContent');

    if (!historyContent) return;

    if (
        !appState.analysisHistory ||
        appState.analysisHistory.length === 0
    ) {

        historyContent.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                No analysis history yet. Start checking job postings!
            </div>
        `;

        return;
    }

    historyContent.innerHTML =
        appState.analysisHistory.map(item => `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">${item.title}</h5>
                    <p class="mb-1"><strong>Type:</strong> ${item.type}</p>
                    <p class="mb-1"><strong>Risk Score:</strong> ${item.safeScore}%</p>
                    <p class="mb-1"><strong>Result:</strong> ${item.riskCategory}</p>
                    <p class="mb-0">
                        <small>${new Date(item.timestamp).toLocaleString()}</small>
                    </p>
                </div>
            </div>
        `).join('');
}

function exportHistory() {
    alert('Export history is not available yet, but analysis results are still saved locally.');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {

    const loginForm =
        document.getElementById('loginForm');

    if (loginForm)
        loginForm.addEventListener('submit', handleLogin);

    const registerForm =
        document.getElementById('registerForm');

    if (registerForm)
        registerForm.addEventListener('submit', handleRegister);

    const forgotPasswordForm =
        document.getElementById('forgotPasswordForm');

    if (forgotPasswordForm)
        forgotPasswordForm.addEventListener(
            'submit',
            handleForgotPassword
        );

    const profileForm =
        document.getElementById('profileForm');

    if (profileForm)
        profileForm.addEventListener('submit', handleProfileSubmit);

    const quickCheckForm =
        document.getElementById('quickCheckForm');

    if (quickCheckForm)
        quickCheckForm.addEventListener('submit', handleQuickAnalysis);

    const analyzeForm =
        document.getElementById('analyzeForm');

    if (analyzeForm)
        analyzeForm.addEventListener('submit', handleAnalyzeSubmit);
}

// ============================================
// LOGIN
// ============================================

function handleLogin(e) {

    e.preventDefault();

    const email =
        document.getElementById('loginEmail').value;

    const password =
        document.getElementById('loginPassword').value;

    if (!email || !password) {

        showAlert('Please fill in all fields', 'danger');

        return;
    }

    if (validatePassword(password)) {

        appState.isLoggedIn = true;

        appState.currentUser = {
            email: email,
            name: email.split('@')[0]
        };

        sessionStorage.setItem(
            'userToken',
            'mock_token_' + Date.now()
        );

        sessionStorage.setItem(
            'userProfile',
            JSON.stringify(appState.currentUser)
        );

        // RESET ALL STATS FOR NEW LOGIN SESSION
        localStorage.removeItem('jobsChecked');
        localStorage.removeItem('scamsDetected');
        localStorage.removeItem('safeJobs');
        localStorage.removeItem('analysisHistory');

        appState.analysisHistory = [];

        showAlert('Login successful!', 'success');

        setTimeout(() => {

            updateNavbarForLoggedIn();

            showPage('home');

            updateUserGreeting();

        }, 500);

    } else {

        showAlert('Invalid email or password', 'danger');
    }
}

// ============================================
// REGISTER
// ============================================

function handleRegister(e) {

    e.preventDefault();

    const firstName =
        document.getElementById('firstName').value;

    const lastName =
        document.getElementById('lastName').value;

    const email =
        document.getElementById('registerEmail').value;

    const password =
        document.getElementById('registerPassword').value;

    const confirmPassword =
        document.getElementById('confirmPassword').value;

    if (
        !firstName   ||
        !lastName    ||
        !email       ||
        !password    ||
        !confirmPassword
    ) {

        showAlert('Please fill in all fields', 'danger');

        return;
    }

    if (password !== confirmPassword) {

        showAlert('Passwords do not match', 'danger');

        return;
    }

    if (!validatePasswordStrength(password)) {

        showAlert('Weak password: must be 8+ chars with uppercase and a number', 'danger');

        return;
    }

    appState.currentUser = {
        email: email,
        name: firstName + ' ' + lastName
    };

    appState.isLoggedIn = true;

    sessionStorage.setItem(
        'userToken',
        'mock_token_' + Date.now()
    );

    sessionStorage.setItem(
        'userProfile',
        JSON.stringify(appState.currentUser)
    );

    // RESET ALL STATS FOR NEW ACCOUNT
    localStorage.removeItem('jobsChecked');
    localStorage.removeItem('scamsDetected');
    localStorage.removeItem('safeJobs');
    localStorage.removeItem('analysisHistory');

    appState.analysisHistory = [];

    showAlert('Account created successfully!', 'success');

    setTimeout(() => {

        updateNavbarForLoggedIn();

        showPage('profile');

        const emailBox =
            document.getElementById('profileEmail');

        if (emailBox)
            emailBox.value = email;

    }, 1000);
}

// ============================================
// FORGOT PASSWORD
// ============================================

function handleForgotPassword(e) {

    e.preventDefault();

    const email =
        document.getElementById('resetEmail').value;

    if (!email) {

        showAlert('Please enter email', 'danger');

        return;
    }

    showAlert('Password reset link sent', 'success');

    setTimeout(() => {

        switchToLogin();

    }, 1500);
}

// ============================================
// SWITCH PAGES
// ============================================

function switchToLogin() {
    showPage('login');
}

function switchToRegister() {
    showPage('register');
}

function switchToForgotPassword() {
    showPage('forgot-password');
}

// ============================================
// PASSWORD VALIDATION
// ============================================

function validatePassword(password) {

    return password && password.length >= 6;
}

function validatePasswordStrength(password) {

    const hasUpperCase  = /[A-Z]/.test(password);
    const hasNumber     = /[0-9]/.test(password);
    const isLongEnough  = password.length >= 8;

    return hasUpperCase && hasNumber && isLongEnough;
}

// ============================================
// PROFILE
// ============================================

function loadProfileForm() {

    if (appState.currentUser) {

        document.getElementById('profileEmail').value =
            appState.currentUser.email;

        document.getElementById('profileName').value =
            appState.currentUser.name || '';
    }
}

function handleProfileSubmit(e) {

    e.preventDefault();

    const profile = {

        name:
            document.getElementById('profileName').value,

        email:
            document.getElementById('profileEmail').value,

        university:
            document.getElementById('profileUniversity').value,

        degree:
            document.getElementById('profileDegree').value,

        year:
            document.getElementById('profileYear').value,

        phone:
            document.getElementById('profilePhone').value,

        interests:
            getSelectedInterests()
    };

    appState.userProfile = profile;

    localStorage.setItem(
        'userProfile',
        JSON.stringify({
            ...appState.currentUser,
            profile: profile
        })
    );

    showAlert('Profile created successfully!', 'success');

    setTimeout(() => {

        showPage('home');

        updateUserGreeting();

    }, 1000);
}

function getSelectedInterests() {

    const interests = [];

    for (let i = 1; i <= 4; i++) {

        const checkbox =
            document.getElementById('interest' + i);

        if (checkbox && checkbox.checked) {

            interests.push(checkbox.value);
        }
    }

    return interests;
}

// ============================================
// QUICK ANALYSIS
// ============================================

function handleQuickAnalysis(e) {

    e.preventDefault();

    const title       = document.getElementById('quickTitle').value.trim();
    const description = document.getElementById('quickDesc').value.trim();
    const email       = document.getElementById('quickEmail').value.trim();
    const website     = document.getElementById('quickWebsite').value.trim();
    const company     = document.getElementById('quickCompany').value.trim();
    const skills      = document.getElementById('quickSkills').value.trim();

    if (!title || !description || !email || !website) {
        showAlert('Please complete all required quick check fields.', 'danger');
        return;
    }

    const result = analyzeJobPosting({
        title, description, email, website, company, skills,
        type: 'Quick Check'
    });

    renderQuickCheckResult(result);
    saveAnalysisHistory(result);
}

// ============================================
// FULL ANALYSIS
// ============================================

function handleAnalyzeSubmit(e) {

    e.preventDefault();

    const title       = document.getElementById('analyzeTitle').value.trim();
    const description = document.getElementById('analyzeDesc').value.trim();
    const email       = document.getElementById('analyzeEmail').value.trim();
    const website     = document.getElementById('analyzeWebsite').value.trim();
    const company     = document.getElementById('analyzeCompany').value.trim();

    if (!title || !description || !email || !website) {

        showAlert(
            'Please complete all required analyze page fields.',
            'danger'
        );

        return;
    }

    const result = analyzeJobPosting({
        title,
        description,
        email,
        website,
        company,
        skills: '',
        type: 'Full Analysis'
    });

    renderAnalyzeResult(result);

    saveAnalysisHistory(result);
}

// ============================================
// ANALYZE JOB POSTING
// ============================================

function analyzeJobPosting(data) {

    const highRiskWords = [
        'pay first', 'pay and', 'hurry up', 'grab the seats',
        'limited seats', 'send money', 'training fee',
        'registration fee', 'deposit required', 'refundable deposit',
        'wire transfer', 'gift card', 'cryptocurrency', 'pay to join',
        'fees required', 'earn daily', 'guaranteed income',
        'easy money', 'earn from home'
    ];

    const mediumRiskWords = [
        'urgent', 'investment', 'work from home',
        'no experience required', 'interview call',
        'hiring immediately', 'urgent hiring', 'certificate',
        'limited offer', 'part time job', 'home based'
    ];

    const lowerDesc = data.description.toLowerCase();

    let riskScore = 0;

    const issues = [];

    highRiskWords.forEach(keyword => {

        if (lowerDesc.includes(keyword)) {

            riskScore += 25;

            issues.push(`⚠️ High risk phrase detected: "${keyword}"`);
        }
    });

    mediumRiskWords.forEach(keyword => {

        if (lowerDesc.includes(keyword)) {

            riskScore += 12;

            issues.push(`🔶 Suspicious phrase found: "${keyword}"`);
        }
    });

    const emailDomain = data.email.split('@')[1] || '';

    if (
        !emailDomain ||
        emailDomain.includes('gmail.com')   ||
        emailDomain.includes('yahoo.com')   ||
        emailDomain.includes('hotmail.com')
    ) {
        riskScore += 20;
        issues.push('📧 Contact email uses a free provider instead of a company domain.');
    }

    const websiteDomain =
        data.website
            .replace(/^https?:\/\//, '')
            .replace(/\/.*$/, '')
            .toLowerCase();

    if (
        data.company &&
        websiteDomain &&
        !websiteDomain.includes(
            data.company.toLowerCase().replace(/\s+/g, '')
        )
    ) {
        riskScore += 10;
        issues.push('🌐 Website domain does not clearly match the company name.');
    }

    if (!data.company) {
        riskScore += 5;
        issues.push('🏢 Company name is missing — low transparency.');
    }

    if (lowerDesc.length < 120) {
        riskScore += 10;
        issues.push('📄 Job description is very short and lacks detail.');
    }

    riskScore = Math.min(riskScore, 100);

    const safeScore = Math.max(0, 100 - riskScore);

    const riskCategory =
        safeScore >= 70 ? 'Low Risk'    :
        safeScore >= 40 ? 'Medium Risk' :
        'High Risk';

    return {
        ...data,
        safeScore,
        riskCategory,
        issues: issues.length
            ? issues
            : ['✅ No major red flags detected. Continue verifying with the company directly.'],
        recommendations: [
            'Verify the company website and contact email domain.',
            'Search for the company and posting on LinkedIn or Glassdoor.',
            'Never transfer money or provide sensitive documents before confirming the employer.',
            'If a job asks you to pay anything upfront — it is almost certainly a scam.'
        ],
        timestamp: new Date().toISOString()
    };
}

// ============================================
// RENDER RESULTS
// ============================================

function renderQuickCheckResult(result) {

    const section = document.getElementById('resultSection');
    const content = document.getElementById('resultContent');

    if (!section || !content) return;

    section.classList.remove('d-none');

    content.innerHTML = buildAnalysisHtml(result);
}

function renderAnalyzeResult(result) {

    const section = document.getElementById('analyzeResultSection');
    const content = document.getElementById('analyzeResultContent');

    if (!section || !content) return;

    section.classList.remove('d-none');

    content.innerHTML = buildAnalysisHtml(result);
}

function buildAnalysisHtml(result) {

    const issueList =
        result.issues.map(item => `<li>${item}</li>`).join('');

    const recList =
        result.recommendations.map(item => `<li>${item}</li>`).join('');

    const badgeColor =
        result.riskCategory === 'Low Risk'    ? 'success' :
        result.riskCategory === 'Medium Risk' ? 'warning' :
        'danger';

    const scoreColor =
        result.riskCategory === 'Low Risk'    ? '#10b981' :
        result.riskCategory === 'Medium Risk' ? '#f59e0b' :
        '#ef4444';

    return `
        <div class="row">
            <div class="col-md-4 mb-3">
                <div class="card bg-dark text-white p-3">
                    <h5>Risk Score</h5>
                    <p class="display-6 fw-bold" style="color:${scoreColor}">
                        ${result.safeScore}%
                    </p>
                    <div class="progress mb-2" style="height:10px">
                        <div class="progress-bar bg-${badgeColor}"
                             style="width:${result.safeScore}%">
                        </div>
                    </div>
                    <span class="badge bg-${badgeColor} fs-6">
                        ${result.riskCategory}
                    </span>
                </div>
            </div>
            <div class="col-md-8 mb-3">
                <div class="card p-3">
                    <h5>Job Summary</h5>
                    <p><strong>Title:</strong> ${result.title}</p>
                    <p><strong>Company:</strong> ${result.company || 'Not provided'}</p>
                    <p><strong>Website:</strong> ${result.website}</p>
                    <p><strong>Contact Email:</strong> ${result.email}</p>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3">
                <div class="card p-3">
                    <h5>Detected Issues</h5>
                    <ul>${issueList}</ul>
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <div class="card p-3">
                    <h5>Recommendations</h5>
                    <ul>${recList}</ul>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// SAVE ANALYSIS & UPDATE STATS
// ============================================

function saveAnalysisHistory(result) {

    if (_saveLock) return;
    _saveLock = true;
    setTimeout(() => { _saveLock = false; }, 1000);

    appState.analysisHistory.unshift(result);

    if (appState.analysisHistory.length > 20) {
        appState.analysisHistory.pop();
    }

    localStorage.setItem(
        'analysisHistory',
        JSON.stringify(appState.analysisHistory)
    );

    const checked =
        (parseInt(localStorage.getItem('jobsChecked')) || 0) + 1;

    localStorage.setItem('jobsChecked', checked);

    if (result.riskCategory === 'High Risk') {

        const scams =
            (parseInt(localStorage.getItem('scamsDetected')) || 0) + 1;

        localStorage.setItem('scamsDetected', scams);

    } else {

        const safe =
            (parseInt(localStorage.getItem('safeJobs')) || 0) + 1;

        localStorage.setItem('safeJobs', safe);
    }

    updateDashboard();
}

// ============================================
// USER PROFILE
// ============================================

function loadUserProfile() {

    const stored =
        sessionStorage.getItem('userProfile');

    if (stored) {

        const data = JSON.parse(stored);

        appState.currentUser = data;

        updateUserGreeting();
    }
}

function updateUserGreeting() {

    const greeting =
        document.getElementById('userGreeting');

    if (greeting && appState.currentUser) {

        const name =
            appState.currentUser.name ||
            appState.currentUser.email.split('@')[0];

        greeting.textContent = name.split(' ')[0];
    }
}

// ============================================
// ALERT
// ============================================

function showAlert(message, type) {

    alert(message);
}

// ============================================
// LOGOUT
// ============================================

function logout() {

    appState.isLoggedIn      = false;
    appState.currentUser     = null;
    appState.userProfile     = null;
    appState.analysisHistory = [];

    sessionStorage.clear();

    const navbar = document.getElementById('navbar');

    if (navbar) navbar.style.display = 'none';

    showPage('login');
}

// ============================================
// THEME TOGGLE
// ============================================

function toggleTheme() {

    document.body.classList.toggle('light-mode');

    const icon =
        document.querySelector('.theme-toggle i');

    if (document.body.classList.contains('light-mode')) {

        icon.className = 'fas fa-sun';

        localStorage.setItem('theme', 'light');

    } else {

        icon.className = 'fas fa-moon';

        localStorage.setItem('theme', 'dark');
    }
}

window.addEventListener('load', () => {

    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'light') {

        document.body.classList.add('light-mode');

        const icon =
            document.querySelector('.theme-toggle i');

        if (icon) icon.className = 'fas fa-sun';
    }
});

// ============================================
// JOB RECOMMENDATIONS
// ============================================

async function fetchRecommendations() {

    const recommendationsSection =
        document.getElementById('recommendations-section');

    const recommendationsContent =
        document.getElementById('recommendations-content');

    if (!recommendationsSection || !recommendationsContent)
        return;

    const skillInput = (
        document.getElementById('jobSkills')?.value ||
        document.getElementById('quickSkills')?.value ||
        appState.userProfile?.degree ||
        'developer'
    ).toLowerCase();

    const locationInput =
        document.getElementById('jobLocation')?.value.toLowerCase() || '';

    recommendationsSection.classList.remove('d-none');

    recommendationsContent.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-info" role="status"></div>
            <p class="mt-2 text-muted">Finding best jobs for you...</p>
        </div>
    `;

    try {

        const query = encodeURIComponent(skillInput || 'developer');

        const res = await fetch(
            `https://remotive.com/api/remote-jobs?search=${query}&limit=20`
        );

        if (!res.ok) throw new Error('API error');

        const data = await res.json();

        let jobs = data.jobs.map(job => ({
            title:    job.title,
            company:  job.company_name,
            location: job.candidate_required_location || 'Remote',
            salary:   job.salary || 'Not specified',
            skills:   job.tags?.join(', ') || '',
            link:     job.url
        }));

        jobs.sort((a, b) =>
            scoreJob(b, skillInput) - scoreJob(a, skillInput)
        );

        jobs = jobs.slice(0, 6);

        if (jobs.length === 0) throw new Error('No results');

        renderJobs(jobs, recommendationsContent);

    } catch (err) {

        console.warn('Remotive API failed, using fallback:', err);

        const fallback = getFallbackJobs(skillInput, locationInput);

        renderJobs(fallback, recommendationsContent);
    }
}

// ============================================
// SCORE JOB BY SKILL MATCH
// ============================================

function scoreJob(job, userSkills) {

    const skills =
        userSkills.toLowerCase().split(',').map(s => s.trim());

    const jobText =
        (job.title + ' ' + job.skills).toLowerCase();

    return skills.filter(s => s && jobText.includes(s)).length;
}

// ============================================
// RENDER JOB CARDS
// ============================================

function renderJobs(jobs, container) {

    container.innerHTML = '';

    if (!jobs || jobs.length === 0) {

        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-search fa-2x mb-3"></i>
                <p>No jobs found. Try different skills or location.</p>
            </div>
        `;

        return;
    }

    jobs.forEach(job => {

        container.innerHTML += `
            <div class="job-card-modern mb-4">
                <div class="d-flex justify-content-between align-items-start flex-wrap">
                    <div>
                        <h5 class="fw-bold text-info mb-2">
                            <i class="fas fa-briefcase"></i>
                            ${job.title}
                        </h5>
                        <p class="mb-1">
                            <i class="fas fa-building"></i>
                            ${job.company}
                        </p>
                        <p class="mb-1">
                            <i class="fas fa-location-dot"></i>
                            ${job.location}
                        </p>
                        <p class="mb-1">
                            <i class="fas fa-indian-rupee-sign"></i>
                            ${job.salary}
                        </p>
                        <p class="mb-3">
                            <i class="fas fa-code"></i>
                            ${job.skills}
                        </p>
                    </div>
                    <div>
                        <a href="${job.link}"
                           target="_blank"
                           rel="noopener noreferrer"
                           onclick="event.stopPropagation();"
                           class="btn btn-primary apply-btn">
                            <i class="fas fa-paper-plane"></i>
                            Apply Now
                        </a>
                    </div>
                </div>
            </div>
        `;
    });
}

// ============================================
// FALLBACK JOBS
// ============================================

function getFallbackJobs(skillInput, locationInput) {

    const allJobs = [
        {
            title:    "Python Django Developer",
            company:  "HCL Technologies",
            location: "Nagpur, India",
            salary:   "6-8 LPA",
            skills:   "Python, Django, REST API",
            link:     "https://www.hcltech.com/careers"
        },
        {
            title:    "Backend Engineer",
            company:  "Persistent Systems",
            location: "Nagpur, India",
            salary:   "5-7 LPA",
            skills:   "Node.js, MongoDB",
            link:     "https://www.persistent.com/careers"
        },
        {
            title:    "AI Engineer",
            company:  "Tech Mahindra",
            location: "Nagpur, India",
            salary:   "8-12 LPA",
            skills:   "Python, AI, Machine Learning",
            link:     "https://careers.techmahindra.com"
        },
        {
            title:    "Python Developer",
            company:  "Infosys",
            location: "Pune, India",
            salary:   "7-10 LPA",
            skills:   "Python, Django",
            link:     "https://career.infosys.com"
        },
        {
            title:    "Django Backend Engineer",
            company:  "Zoho",
            location: "Chennai, India",
            salary:   "8-11 LPA",
            skills:   "Python, Django, APIs",
            link:     "https://www.zoho.com/careers"
        },
        {
            title:    "Software Engineer",
            company:  "TCS",
            location: "Mumbai, India",
            salary:   "4-6 LPA",
            skills:   "Programming, Java, Python",
            link:     "https://www.tcs.com/careers"
        }
    ];

    let filtered = locationInput
        ? allJobs.filter(j =>
            j.location.toLowerCase().includes(locationInput)
          )
        : allJobs;

    if (filtered.length === 0) filtered = allJobs;

    filtered.sort((a, b) =>
        scoreJob(b, skillInput) - scoreJob(a, skillInput)
    );

    return filtered.slice(0, 6);
}