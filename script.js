// script.js - Dashboard: Load and display 10 test cards, navigate to exam.html with selected set

const totalSets = 10;
const questionsPerSet = 151;
const durationHours = 3;

const testsGrid = document.getElementById('tests-grid');

function createTestCard(setNumber) {
    const card = document.createElement('div');
    card.className = 'test-card';
    
    card.innerHTML = `
        <h3>MCQs Set ${setNumber}</h3>
        <div class="test-meta">
            <span>${questionsPerSet} Questions</span>
            <span>${durationHours} Hours</span>
        </div>
        <button class="start-test-btn" data-set="${setNumber}">Start Exam</button>
    `;
    
    const startBtn = card.querySelector('.start-test-btn');
    startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sessionStorage.setItem('selectedTestSet', setNumber);
        window.location.href = 'exam.html';
    });
    
    return card;
}

function buildDashboard() {
    if (!testsGrid) {
        console.error('Tests grid element not found');
        return;
    }
    
    testsGrid.innerHTML = '';
    
    for (let i = 1; i <= totalSets; i++) {
        const card = createTestCard(i);
        testsGrid.appendChild(card);
    }
}

sessionStorage.removeItem('selectedTestSet');

document.addEventListener('DOMContentLoaded', function() {
    buildDashboard();
});