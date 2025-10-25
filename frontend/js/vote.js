// Voting interface logic

let categories = [];
let entries = [];
let currentCategoryIndex = 0;
let votes = {}; // { categoryId: entryId }

// Load saved votes from localStorage
function loadSavedVotes() {
    const saved = localStorage.getItem('halloween_votes');
    if (saved) {
        votes = JSON.parse(saved);
    }
}

// Save votes to localStorage
function saveVotes() {
    localStorage.setItem('halloween_votes', JSON.stringify(votes));
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
        const categoriesResponse = await fetch(`${API_BASE_URL}/api/categories`);
        if (!categoriesResponse.ok) throw new Error('Failed to load categories');
        categories = await categoriesResponse.json();

        // Load entries
        const entriesResponse = await fetch(`${API_BASE_URL}/api/entries`);
        if (!entriesResponse.ok) throw new Error('Failed to load entries');
        entries = await entriesResponse.json();

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
}

// Render current category's costumes
function renderCategory() {
    const currentCategory = categories[currentCategoryIndex];
    const gallery = document.getElementById('costumeGallery');

    // Update tabs
    renderCategoryTabs();

    // Update voting status
    const votedCount = Object.keys(votes).length;
    const statusText = `You've voted in ${votedCount} of ${categories.length} categories`;
    document.getElementById('votingStatus').textContent = statusText;

    // Render costumes
    gallery.innerHTML = '';

    entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'costume-card';

        if (votes[currentCategory.id] === entry.id) {
            card.classList.add('selected');
        }

        card.innerHTML = `
            <img src="${API_BASE_URL}${entry.photo_url}" alt="${entry.costume_name}">
            <div class="costume-card-info">
                <h3>${entry.name}</h3>
                <p>${entry.costume_name}</p>
            </div>
        `;

        card.onclick = () => selectEntry(entry.id);

        gallery.appendChild(card);
    });

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

// Update navigation buttons
function updateNavButtons() {
    const prevBtn = document.getElementById('prevCategory');
    const nextBtn = document.getElementById('nextCategory');
    const submitBtn = document.getElementById('submitVotes');

    // Previous button
    prevBtn.style.display = currentCategoryIndex > 0 ? 'block' : 'none';
    prevBtn.onclick = () => {
        currentCategoryIndex--;
        renderCategory();
    };

    // Next/Submit button
    if (currentCategoryIndex < categories.length - 1) {
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
    const votedCount = Object.keys(votes).length;
    if (votedCount < categories.length) {
        const confirm = window.confirm(
            `You've only voted in ${votedCount} of ${categories.length} categories. ` +
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

        // Submit each vote
        const promises = Object.entries(votes).map(([categoryId, entryId]) => {
            return fetch(`${API_BASE_URL}/api/votes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: categoryId,
                    entry_id: entryId,
                    voter_id: voterId
                })
            });
        });

        await Promise.all(promises);

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
