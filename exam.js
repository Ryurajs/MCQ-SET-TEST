// exam.js - Complete with JSON Storage and Result Comparison (FIXED)

// ---------- GLOBAL STATE ----------
let currentQuestions = [];
let userAnswers = [];
let totalQuestions = 151;
let timerInterval = null;
let timeSeconds = 3 * 3600;
let currentQuestionIdx = 0;
let testActive = true;
let currentSetNumber = 1;
let isInitialized = false;
let startTime = null;
let endTime = null;
let currentSessionId = null;
let previousResults = [];

// DOM Elements
const examSetTitle = document.getElementById('examSetTitle');
const timerDisplaySpan = document.getElementById('timeValue');
const questionTextDiv = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const qNumberSpan = document.getElementById('qNumber');
const qStatusBadge = document.getElementById('qStatusBadge');
const saveNextBtn = document.getElementById('saveNextBtn');
const clearResponseBtn = document.getElementById('clearResponseBtn');
const prevQuestionBtn = document.getElementById('prevQuestionBtn');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const questionsGridDiv = document.getElementById('questionsGrid');
const answeredCountSpan = document.getElementById('answeredCount');
const notAnsweredCountSpan = document.getElementById('notAnsweredCount');
const submitTestBtn = document.getElementById('submitTestBtn');
const examContentWrapper = document.getElementById('examContentWrapper');
const reviewSection = document.getElementById('reviewSection');
const backLink = document.getElementById('backToDashboardLink');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const mobileResetTestBtn = document.getElementById('mobileResetTestBtn');
const mobileSubmitTestBtn = document.getElementById('mobileSubmitTestBtn');
const mobileAnsweredCount = document.getElementById('mobileAnsweredCount');
const mobileUnansweredCount = document.getElementById('mobileUnansweredCount');
const questionPanel = document.getElementById('questionPanel');

// Helper: Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Helper: format seconds to HH:MM:SS
function formatTime(secs) {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Load results from localStorage (simulating JSON file)
function loadResultsFromStorage() {
    try {
        const saved = localStorage.getItem('dhamcq_exam_results');
        if (saved) {
            const data = JSON.parse(saved);
            previousResults = data.results || [];
            console.log('Loaded results:', previousResults.length);
            return previousResults;
        } else {
            // Initialize empty results
            const emptyData = { results: [] };
            localStorage.setItem('dhamcq_exam_results', JSON.stringify(emptyData));
            previousResults = [];
            return [];
        }
    } catch (err) {
        console.error('Error loading results:', err);
        previousResults = [];
        return [];
    }
}

// Save result to localStorage (simulating JSON file)
function saveResultToStorage(resultData) {
    try {
        let existingData = { results: [] };
        const saved = localStorage.getItem('dhamcq_exam_results');
        if (saved) {
            existingData = JSON.parse(saved);
        }
        
        // Add new result
        existingData.results.push(resultData);
        
        // Keep only last 20 results per set to avoid too much data
        const setResults = existingData.results.filter(r => r.setNumber === resultData.setNumber);
        if (setResults.length > 20) {
            const toRemove = setResults.slice(0, setResults.length - 20);
            existingData.results = existingData.results.filter(r => !toRemove.includes(r));
        }
        
        localStorage.setItem('dhamcq_exam_results', JSON.stringify(existingData));
        previousResults = existingData.results;
        console.log('Saved result:', resultData);
        return true;
    } catch (err) {
        console.error('Error saving result:', err);
        return false;
    }
}

// Get results for current test set
function getResultsForCurrentSet() {
    return previousResults.filter(r => r.setNumber === currentSetNumber);
}

// Render comparison list
function renderComparisonList(containerId, isMobile = false) {
    const setResults = getResultsForCurrentSet();
    const container = document.getElementById(containerId);
    if (!container) {
        console.log('Container not found:', containerId);
        return;
    }
    
    console.log('Rendering comparison for set', currentSetNumber, 'Results:', setResults.length);
    
    if (setResults.length === 0) {
        container.innerHTML = '<div class="comparison-item">No previous attempts. Complete a test to see comparison.</div>';
        return;
    }
    
    // Sort by date (newest first)
    setResults.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = '';
    setResults.forEach((result, idx) => {
        const isCurrent = result.sessionId === currentSessionId;
        let comparisonHtml = '';
        
        if (idx > 0) {
            const prevResult = setResults[idx - 1];
            const diff = parseFloat(result.percentage) - parseFloat(prevResult.percentage);
            if (diff > 0) {
                comparisonHtml = `<div class="comparison-badge improved">↑ Improved by ${diff.toFixed(1)}%</div>`;
            } else if (diff < 0) {
                comparisonHtml = `<div class="comparison-badge declined">↓ Declined by ${Math.abs(diff).toFixed(1)}%</div>`;
            } else {
                comparisonHtml = `<div class="comparison-badge same">→ Same score</div>`;
            }
        } else if (setResults.length > 1) {
            const nextResult = setResults[1];
            const diff = parseFloat(result.percentage) - parseFloat(nextResult.percentage);
            if (diff > 0) {
                comparisonHtml = `<div class="comparison-badge improved">↑ Improved from previous</div>`;
            } else if (diff < 0) {
                comparisonHtml = `<div class="comparison-badge declined">↓ Declined from previous</div>`;
            }
        }
        
        const dateStr = new Date(result.date).toLocaleString();
        
        html += `
            <div class="comparison-item ${isCurrent ? 'current' : ''}">
                <div class="comparison-date">${dateStr}</div>
                <div class="comparison-score">Score: ${result.totalScore}/${result.totalQuestions}</div>
                <div class="comparison-percentage">${result.percentage}%</div>
                ${comparisonHtml}
                <div style="font-size:0.7rem; color:#5f7f9e; margin-top:0.3rem;">
                    ✓${result.correctCount} ✗${result.incorrectCount} ○${result.skippedCount}
                </div>
                ${result.isPartial ? '<div style="font-size:0.65rem; color:#f39c12;">(Partial - Reset)</div>' : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Update timer display
function updateTimerDisplay() {
    if (timerDisplaySpan) timerDisplaySpan.innerText = formatTime(timeSeconds);
    if (timeSeconds <= 0 && testActive) {
        clearInterval(timerInterval);
        testActive = false;
        alert("Time's up! Submitting your test automatically.");
        calculateAndShowReview();
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(() => {
        if (testActive && timeSeconds > 0) {
            timeSeconds--;
            updateTimerDisplay();
            if (timeSeconds === 0) {
                clearInterval(timerInterval);
                calculateAndShowReview();
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Auto-scroll to question on mobile
function scrollToQuestionOnMobile() {
    if (window.innerWidth <= 768 && questionPanel) {
        setTimeout(() => {
            questionPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// Calculate current score without submitting
function calculateCurrentScore() {
    let score = 0;
    for (let i = 0; i < totalQuestions; i++) {
        const userAns = userAnswers[i];
        const correct = currentQuestions[i]?.correct_answer;
        if (userAns && correct && userAns.trim() === correct.trim()) {
            score++;
        }
    }
    return score;
}

// Reset test with saving previous result
function resetTest() {
    if (!testActive) {
        alert("Test has already been submitted. Cannot reset.");
        closeMobileMenu();
        return;
    }
    
    // Check if any answers were given
    const hasAnswers = userAnswers.some(ans => ans !== null && ans !== "");
    
    if (hasAnswers) {
        const confirmReset = confirm("Reset will save your current progress as a previous attempt. Continue?");
        if (!confirmReset) return;
        
        // Calculate current progress
        const currentScore = calculateCurrentScore();
        const answeredCount = userAnswers.filter(ans => ans !== null && ans !== "").length;
        const incorrectCount = answeredCount - currentScore;
        const skippedCount = totalQuestions - answeredCount;
        
        // Save current progress as a result before resetting
        const resultData = {
            sessionId: currentSessionId + '_partial_' + Date.now(),
            setNumber: currentSetNumber,
            totalScore: currentScore,
            totalQuestions: totalQuestions,
            percentage: ((currentScore / totalQuestions) * 100).toFixed(1),
            correctCount: currentScore,
            incorrectCount: incorrectCount,
            skippedCount: skippedCount,
            completionTime: Math.floor((Date.now() - startTime) / 1000),
            date: new Date().toISOString(),
            isPartial: true
        };
        
        saveResultToStorage(resultData);
        loadResultsFromStorage();
    }
    
    // Reset all answers
    userAnswers = new Array(totalQuestions).fill(null);
    currentQuestionIdx = 0;
    timeSeconds = 3 * 3600;
    testActive = true;
    currentSessionId = generateSessionId();
    
    // Reset timer display
    updateTimerDisplay();
    stopTimer();
    startTimer();
    
    // Re-render UI
    renderCurrentQuestion();
    renderNavigator();
    
    // Refresh comparison displays
    renderComparisonList('comparisonList');
    renderComparisonList('mobileComparisonList', true);
    
    alert("Test has been reset. Your previous progress has been saved.");
    closeMobileMenu();
    scrollToQuestionOnMobile();
}

// Mobile Menu Functions
function openMobileMenu() {
    if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.add('active');
        const answeredCount = userAnswers.filter(ans => ans !== null && ans !== "").length;
        if (mobileAnsweredCount) mobileAnsweredCount.innerText = answeredCount;
        if (mobileUnansweredCount) mobileUnansweredCount.innerText = totalQuestions - answeredCount;
        renderComparisonList('mobileComparisonList', true);
    }
}

function closeMobileMenu() {
    if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.remove('active');
    }
}

// Render navigator
function renderNavigator() {
    const answeredCount = userAnswers.filter(ans => ans !== null && ans !== "").length;
    answeredCountSpan.innerText = answeredCount;
    notAnsweredCountSpan.innerText = totalQuestions - answeredCount;
    
    if (mobileAnsweredCount) mobileAnsweredCount.innerText = answeredCount;
    if (mobileUnansweredCount) mobileUnansweredCount.innerText = totalQuestions - answeredCount;
    
    let html = '';
    for (let i = 0; i < totalQuestions; i++) {
        let btnClass = 'q-nav-btn';
        if (userAnswers[i] && userAnswers[i] !== "") btnClass += ' answered';
        if (currentQuestionIdx === i) btnClass += ' current';
        html += `<button class="${btnClass}" data-qidx="${i}">${i + 1}</button>`;
    }
    questionsGridDiv.innerHTML = html;
    
    document.querySelectorAll('.q-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.getAttribute('data-qidx'));
            if (!isNaN(idx)) {
                goToQuestion(idx);
                scrollToQuestionOnMobile();
            }
        });
    });
}

// Render current question
function renderCurrentQuestion() {
    if (!testActive || !currentQuestions.length) return;
    const q = currentQuestions[currentQuestionIdx];
    if (!q) return;
    
    let questionText = q.question;
    questionText = questionText.replace(/\[Demo\]\s*/g, '');
    questionTextDiv.innerText = `${currentQuestionIdx + 1}. ${questionText}`;
    
    let optsHtml = '';
    const selectedAnswer = userAnswers[currentQuestionIdx] || '';
    q.options.forEach((opt, idx) => {
        const isChecked = (selectedAnswer === opt);
        const escapedOpt = escapeHtml(opt);
        optsHtml += `
            <div class="option-item" data-opt-index="${idx}">
                <input type="radio" name="questionOption" class="option-radio" value="${escapedOpt}" id="opt_${idx}" ${isChecked ? 'checked' : ''}>
                <label for="opt_${idx}" class="option-text">${escapedOpt}</label>
            </div>
        `;
    });
    optionsContainer.innerHTML = optsHtml;
    
    document.querySelectorAll('input[name="questionOption"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedVal = e.target.value;
            userAnswers[currentQuestionIdx] = selectedVal;
            renderNavigator();
            updateStatusBadge();
        });
    });
    
    qNumberSpan.innerText = `Question ${currentQuestionIdx + 1} of ${totalQuestions}`;
    updateStatusBadge();
    scrollToQuestionOnMobile();
}

function updateStatusBadge() {
    if (!testActive) return;
    const ans = userAnswers[currentQuestionIdx];
    if (ans && ans !== "") {
        qStatusBadge.innerText = "Answered";
        qStatusBadge.style.backgroundColor = "#e0f7e8";
        qStatusBadge.style.color = "#1f7840";
    } else {
        qStatusBadge.innerText = "Not Answered";
        qStatusBadge.style.backgroundColor = "#f1f5f9";
        qStatusBadge.style.color = "#5b6e8c";
    }
}

function goToQuestion(idx) {
    if (idx >= 0 && idx < totalQuestions) {
        currentQuestionIdx = idx;
        renderCurrentQuestion();
        renderNavigator();
    }
}

function saveCurrentAndNext() {
    const selectedRadio = document.querySelector('input[name="questionOption"]:checked');
    if (selectedRadio) {
        userAnswers[currentQuestionIdx] = selectedRadio.value;
    }
    renderNavigator();
    if (currentQuestionIdx + 1 < totalQuestions) {
        goToQuestion(currentQuestionIdx + 1);
    } else {
        alert("You are at the last question. Press 'Submit Test' to finish.");
    }
}

function clearCurrentResponse() {
    if (!testActive) return;
    const radios = document.querySelectorAll('input[name="questionOption"]');
    radios.forEach(radio => radio.checked = false);
    userAnswers[currentQuestionIdx] = null;
    renderNavigator();
    updateStatusBadge();
}

// Calculate and show review
function calculateAndShowReview() {
    if (!testActive && reviewSection.style.display === 'block') return;
    
    endTime = Date.now();
    const completionSeconds = Math.floor((endTime - startTime) / 1000);
    const completionTimeFormatted = formatTime(completionSeconds);
    
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    const reviewData = [];
    
    for (let i = 0; i < totalQuestions; i++) {
        const userAns = userAnswers[i];
        const correct = currentQuestions[i]?.correct_answer;
        const isCorrect = (userAns && correct && userAns.trim() === correct.trim());
        const isSkipped = (!userAns || userAns === "");
        
        if (isCorrect) {
            correctCount++;
        } else if (isSkipped) {
            skippedCount++;
        } else {
            incorrectCount++;
        }
        
        let cleanQuestionText = currentQuestions[i]?.question || '';
        cleanQuestionText = cleanQuestionText.replace(/\[Demo\]\s*/g, '');
        
        let status = '';
        let statusIcon = '';
        if (isCorrect) {
            status = 'correct';
            statusIcon = '✓';
        } else if (isSkipped) {
            status = 'skipped';
            statusIcon = '○';
        } else {
            status = 'wrong';
            statusIcon = '✗';
        }
        
        reviewData.push({
            questionNumber: i + 1,
            questionText: cleanQuestionText,
            userAnswer: userAns || "Not Answered",
            correctAnswer: correct,
            isCorrect: isCorrect,
            isSkipped: isSkipped,
            status: status,
            statusIcon: statusIcon
        });
    }
    
    const totalScore = correctCount;
    const percentage = ((totalScore / totalQuestions) * 100).toFixed(1);
    
    // Save result to storage
    const resultData = {
        sessionId: currentSessionId,
        setNumber: currentSetNumber,
        totalScore: totalScore,
        totalQuestions: totalQuestions,
        percentage: percentage,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        skippedCount: skippedCount,
        completionTime: completionSeconds,
        date: new Date().toISOString(),
        isPartial: false
    };
    
    saveResultToStorage(resultData);
    loadResultsFromStorage();
    
    // Update review stats
    document.getElementById('reviewScore').innerText = totalScore;
    document.getElementById('reviewTotal').innerText = totalQuestions;
    document.getElementById('reviewPercentage').innerText = percentage + '%';
    document.getElementById('reviewCorrect').innerText = correctCount;
    document.getElementById('reviewWrong').innerText = incorrectCount;
    document.getElementById('reviewSkipped').innerText = skippedCount;
    document.getElementById('completionTime').innerText = completionTimeFormatted;
    
    window.reviewData = reviewData;
    renderReviewQuestions('all');
    setupFilterTabs();
    renderComparisonList('comparisonList');
    
    if (examContentWrapper) examContentWrapper.style.display = 'none';
    if (reviewSection) reviewSection.style.display = 'block';
    testActive = false;
    stopTimer();
    closeMobileMenu();
}

function renderReviewQuestions(filter) {
    if (!window.reviewData) return;
    
    let filteredData = window.reviewData;
    if (filter === 'correct') {
        filteredData = window.reviewData.filter(item => item.isCorrect === true);
    } else if (filter === 'incorrect') {
        filteredData = window.reviewData.filter(item => !item.isCorrect && !item.isSkipped);
    } else if (filter === 'skipped') {
        filteredData = window.reviewData.filter(item => item.isSkipped === true);
    }
    
    let reviewHtml = '';
    for (const item of filteredData) {
        reviewHtml += `
            <div class="review-question-item">
                <div class="review-question-text">
                    <span class="review-status-icon ${item.status}">${item.statusIcon}</span>
                    <strong>Question ${item.questionNumber}:</strong> ${escapeHtml(item.questionText)}
                </div>
                <div class="review-answer-area">
                    <div class="review-user-answer ${item.status}">
                        <strong>Your Answer:</strong> ${escapeHtml(item.userAnswer)}
                    </div>
                    <div class="review-correct-answer">
                        <strong>Correct Answer:</strong> ${escapeHtml(item.correctAnswer)}
                    </div>
                </div>
            </div>
        `;
    }
    
    if (filteredData.length === 0) {
        reviewHtml = '<div style="text-align: center; padding: 2rem; color: #5f7f9e;">No questions found for this filter.</div>';
    }
    
    document.getElementById('reviewQuestions').innerHTML = reviewHtml;
}

function setupFilterTabs() {
    const tabs = document.querySelectorAll('.review-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.getAttribute('data-filter');
            renderReviewQuestions(filter);
        });
    });
}

function submitTestHandler() {
    if (!testActive) {
        alert("Test already submitted.");
        closeMobileMenu();
        return;
    }
    const confirmSubmit = confirm("Are you sure you want to submit the test?");
    if (confirmSubmit) {
        testActive = false;
        stopTimer();
        calculateAndShowReview();
    }
    closeMobileMenu();
}

// Load test set
async function loadTestSet(setNumber) {
    const fileName = `MCQs JSON/MCQs Set ${setNumber}.json`;
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const jsonData = await response.json();
        if (!Array.isArray(jsonData)) throw new Error("Invalid JSON format");
        return jsonData;
    } catch (err) {
        console.error(`Error loading ${fileName}:`, err);
        const mockQuestions = [];
        for (let i = 1; i <= 151; i++) {
            mockQuestions.push({
                question: `Sample Question ${i} for Set ${setNumber}.`,
                options: ["Option A", "Option B", "Option C", "All"],
                correct_answer: "All"
            });
        }
        return mockQuestions;
    }
}

// Initialize exam
async function initExam() {
    if (isInitialized) return;
    isInitialized = true;
    
    const selectedSet = sessionStorage.getItem('selectedTestSet');
    if (!selectedSet) {
        alert('No test selected. Please select a test from the dashboard.');
        window.location.replace('index.html');
        return;
    }
    
    currentSetNumber = parseInt(selectedSet);
    examSetTitle.innerText = `MCQs Set ${currentSetNumber}`;
    currentSessionId = generateSessionId();
    
    // Load previous results
    loadResultsFromStorage();
    console.log('Previous results loaded:', getResultsForCurrentSet().length);
    
    questionTextDiv.innerText = "Loading questions... Please wait.";
    optionsContainer.innerHTML = "";
    
    const questions = await loadTestSet(currentSetNumber);
    currentQuestions = questions;
    totalQuestions = questions.length;
    userAnswers = new Array(totalQuestions).fill(null);
    currentQuestionIdx = 0;
    timeSeconds = 3 * 3600;
    testActive = true;
    
    updateTimerDisplay();
    startTimer();
    renderCurrentQuestion();
    renderNavigator();
}

// Event listeners
if (backLink) {
    backLink.addEventListener('click', (e) => {
        if (testActive && timerInterval) {
            const confirmExit = confirm("Test in progress! Your progress will be lost if you go back. Are you sure?");
            if (!confirmExit) {
                e.preventDefault();
                return;
            }
            stopTimer();
        }
        sessionStorage.removeItem('selectedTestSet');
    });
}

if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMobileMenu);
if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMobileMenu);
if (mobileResetTestBtn) mobileResetTestBtn.addEventListener('click', resetTest);
if (mobileSubmitTestBtn) mobileSubmitTestBtn.addEventListener('click', submitTestHandler);

// Close menu when clicking outside
document.addEventListener('click', function(e) {
    if (mobileMenuOverlay && mobileMenuOverlay.classList.contains('active')) {
        if (!mobileMenuOverlay.contains(e.target) && e.target !== hamburgerBtn && !hamburgerBtn?.contains(e.target)) {
            closeMobileMenu();
        }
    }
});

if (saveNextBtn) saveNextBtn.addEventListener('click', saveCurrentAndNext);
if (clearResponseBtn) clearResponseBtn.addEventListener('click', clearCurrentResponse);
if (prevQuestionBtn) {
    prevQuestionBtn.addEventListener('click', () => {
        if (currentQuestionIdx > 0) {
            goToQuestion(currentQuestionIdx - 1);
        }
    });
}
if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', () => {
        if (currentQuestionIdx + 1 < totalQuestions) {
            goToQuestion(currentQuestionIdx + 1);
        } else {
            alert("Last question. Use 'Submit Test' to finish.");
        }
    });
}
if (submitTestBtn) submitTestBtn.addEventListener('click', submitTestHandler);

// Close review and go back to dashboard
document.addEventListener('click', function(e) {
    if (e.target.id === 'closeReviewBtn') {
        window.location.href = 'index.html';
    }
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Start the exam
initExam();
