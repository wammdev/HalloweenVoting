// Voting interface logic

let categories = [];
let entries = [];
let mcQuestions = [];
let currentCategoryIndex = 0;
let votes = {}; // { categoryId: entryId }
let mcVotes = {}; // { questionId: optionId }

// Load saved votes from localStorage
function loadSavedVotes() {
    const saved = localStorage.getItem('halloween_votes');
    if (saved) {
        votes = JSON.parse(saved);
    }
    const savedMc = localStorage.getItem('halloween_mc_votes');
    if (savedMc) {
        mcVotes = JSON.parse(savedMc);
    }
}

// Save votes to localStorage
function saveVotes() {
    localStorage.setItem('halloween_votes', JSON.stringify(votes));
    localStorage.setItem('halloween_mc_votes', JSON.stringify(mcVotes));
}

// Generate voter ID (simple fingerprint)
function getVoterId() {
    let voterId = localStorage.getItem('halloween_voter_id');
    if (!voterId) {
        voterId = 'voter_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('halloween_voter_id', voterId);
    }
    return voterId;
}

// Initialize voting interface
async function init() {
    try {
        // Load categories
        const categoriesResponse = await fetch(`${API_BASE_URL}/api/categories`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        if (!categoriesResponse.ok) throw new Error('Failed to load categories');
        categories = await categoriesResponse.json();

        // Load entries
        const entriesResponse = await fetch(`${API_BASE_URL}/api/entries`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        if (!entriesResponse.ok) throw new Error('Failed to load entries');
        entries = await entriesResponse.json();

        // Load multiple choice questions
        const mcResponse = await fetch(`${API_BASE_URL}/api/mc-questions`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        if (!mcResponse.ok) throw new Error('Failed to load questions');
        mcQuestions = await mcResponse.json();

        // Load saved votes
        loadSavedVotes();

        // Hide loading, show interface
        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('votingInterface').style.display = 'block';

        // Render category tabs
        renderCategoryTabs();

        // Render current category
        renderCategory();

    } catch (error) {
        console.error('Error initializing voting:', error);
        showError(`Failed to load voting data: ${error.message}`);
        document.getElementById('loadingMessage').style.display = 'none';
    }
}

// Render category tabs
function renderCategoryTabs() {
    const tabsContainer = document.getElementById('categoryTabs');
    tabsContainer.innerHTML = '';

    // Add costume category tabs
    categories.forEach((category, index) => {
        const tab = document.createElement('button');
        tab.className = 'category-tab';
        tab.textContent = category.name;
        tab.onclick = () => {
            currentCategoryIndex = index;
            renderCategory();
        };

        if (index === currentCategoryIndex) {
            tab.classList.add('active');
        }

        if (votes[category.id]) {
            tab.classList.add('voted');
        }

        tabsContainer.appendChild(tab);
    });

    // Add MC question tabs
    mcQuestions.forEach((question, mcIndex) => {
        const index = categories.length + mcIndex;
        const tab = document.createElement('button');
        tab.className = 'category-tab mc-tab';
        tab.textContent = '📋 ' + question.question;
        tab.onclick = () => {
            currentCategoryIndex = index;
            renderCategory();
        };

        if (index === currentCategoryIndex) {
            tab.classList.add('active');
        }

        if (mcVotes[question.id]) {
            tab.classList.add('voted');
        }

        tabsContainer.appendChild(tab);
    });
}

// Render current category's costumes
function renderCategory() {
    const gallery = document.getElementById('costumeGallery');

    // Update tabs
    renderCategoryTabs();

    // Check if we're showing a costume category or MC question
    const totalCategories = categories.length + mcQuestions.length;
    const isMcQuestion = currentCategoryIndex >= categories.length;

    // Update voting status
    const votedCount = Object.keys(votes).length + Object.keys(mcVotes).length;
    const statusText = `You've voted in ${votedCount} of ${totalCategories} categories`;
    document.getElementById('votingStatus').textContent = statusText;

    // Render appropriate content
    gallery.innerHTML = '';

    if (isMcQuestion) {
        // Render MC question
        const mcIndex = currentCategoryIndex - categories.length;
        const question = mcQuestions[mcIndex];

        const questionDiv = document.createElement('div');
        questionDiv.className = 'mc-question-container';
        questionDiv.innerHTML = `<h2 class="mc-question-title">${question.question}</h2>`;

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'mc-options';

        question.options.forEach(option => {
            const optionCard = document.createElement('div');
            optionCard.className = 'mc-option-card';

            if (mcVotes[question.id] === option.id) {
                optionCard.classList.add('selected');
            }

            optionCard.innerHTML = `
                <div class="mc-option-text">${option.option_text}</div>
            `;

            optionCard.onclick = () => selectMcOption(question.id, option.id);

            optionsDiv.appendChild(optionCard);
        });

        questionDiv.appendChild(optionsDiv);
        gallery.appendChild(questionDiv);
    } else {
        // Render costume category
        const currentCategory = categories[currentCategoryIndex];

        entries.forEach(async entry => {
            const card = document.createElement('div');
            card.className = 'costume-card';

            if (votes[currentCategory.id] === entry.id) {
                card.classList.add('selected');
            }

            // Create image element with loading state
            const img = document.createElement('img');
            img.alt = entry.costume_name;
            img.style.opacity = '0.5';
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="250"%3E%3Crect fill="%232a2a2a" width="250" height="250"/%3E%3Ctext x="125" y="125" text-anchor="middle" fill="%23999" font-size="14"%3ELoading...%3C/text%3E%3C/svg%3E';

            // Load image with proper headers
            const imageUrl = `${API_BASE_URL}${entry.photo_url}`;
            loadImageWithHeaders(imageUrl).then(blobUrl => {
                img.src = blobUrl;
                img.style.opacity = '1';
            }).catch(err => {
                console.error('Failed to load image:', err);
                img.style.opacity = '1';
            });

            const infoDiv = document.createElement('div');
            infoDiv.className = 'costume-card-info';
            infoDiv.innerHTML = `
                <h3>${entry.name}</h3>
                <p>${entry.costume_name}</p>
            `;

            card.appendChild(img);
            card.appendChild(infoDiv);
            card.onclick = () => selectEntry(entry.id);

            gallery.appendChild(card);
        });
    }

    // Update navigation buttons
    updateNavButtons();
}

// Select an entry for the current category
function selectEntry(entryId) {
    const currentCategory = categories[currentCategoryIndex];
    votes[currentCategory.id] = entryId;
    saveVotes();
    renderCategory();
}

// Select an option for a multiple choice question
function selectMcOption(questionId, optionId) {
    mcVotes[questionId] = optionId;
    saveVotes();
    renderCategory();
}

// Update navigation buttons
function updateNavButtons() {
    const prevBtn = document.getElementById('prevCategory');
    const nextBtn = document.getElementById('nextCategory');
    const submitBtn = document.getElementById('submitVotes');
    const totalItems = categories.length + mcQuestions.length;

    // Previous button
    prevBtn.style.display = currentCategoryIndex > 0 ? 'block' : 'none';
    prevBtn.onclick = () => {
        currentCategoryIndex--;
        renderCategory();
    };

    // Next/Submit button
    if (currentCategoryIndex < totalItems - 1) {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
        nextBtn.onclick = () => {
            currentCategoryIndex++;
            renderCategory();
        };
    } else {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    }
}

// Submit all votes
document.getElementById('submitVotes').addEventListener('click', async function() {
    // Check if all categories have votes
    const totalItems = categories.length + mcQuestions.length;
    const votedCount = Object.keys(votes).length + Object.keys(mcVotes).length;
    if (votedCount < totalItems) {
        const confirm = window.confirm(
            `You've only voted in ${votedCount} of ${totalItems} categories. ` +
            `Do you want to submit anyway?`
        );
        if (!confirm) return;
    }

    // Disable button
    const submitBtn = this;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const voterId = getVoterId();

        // Submit costume votes
        const costumePromises = Object.entries(votes).map(([categoryId, entryId]) => {
            return fetch(`${API_BASE_URL}/api/votes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    category: categoryId,
                    entry_id: entryId,
                    voter_id: voterId
                })
            });
        });

        // Submit MC votes
        const mcPromises = Object.entries(mcVotes).map(([questionId, optionId]) => {
            return fetch(`${API_BASE_URL}/api/mc-votes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    question_id: questionId,
                    option_id: optionId,
                    voter_id: voterId
                })
            });
        });

        await Promise.all([...costumePromises, ...mcPromises]);

        // Success!
        showSuccess('🎉 Your votes have been submitted successfully! Thank you for participating!');

        // Scroll to success message
        document.getElementById('successMessage').scrollIntoView({ behavior: 'smooth' });

        // Disable further voting
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);

    } catch (error) {
        console.error('Error submitting votes:', error);
        showError(`Failed to submit votes: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit All Votes';
    }
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth' });
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
}

// Initialize on page load
init();
