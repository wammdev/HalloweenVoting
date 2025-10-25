// Results page logic

let currentPassword = null;
let refreshInterval = null;

// Handle password form submission
document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const password = document.getElementById('password').value;

    try {
        await loadResults(password);

        // Success! Save password and show results
        currentPassword = password;
        document.getElementById('passwordPrompt').style.display = 'none';
        document.getElementById('resultsDisplay').style.display = 'block';

        // Auto-refresh every 10 seconds
        refreshInterval = setInterval(() => loadResults(currentPassword), 10000);

    } catch (error) {
        showError(error.message);
    }
});

// Manual refresh button
document.getElementById('refreshBtn').addEventListener('click', function() {
    if (currentPassword) {
        loadResults(currentPassword);
    }
});

// Load results from API
async function loadResults(password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/results`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Incorrect password');
            }
            throw new Error('Failed to load results');
        }

        const results = await response.json();
        renderResults(results);

    } catch (error) {
        console.error('Error loading results:', error);
        throw error;
    }
}

// Render results
function renderResults(results) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    results.forEach(categoryData => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'results-category';

        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = categoryData.category;
        categoryDiv.appendChild(categoryTitle);

        const resultsList = document.createElement('div');
        resultsList.className = 'results-list';

        // Sort by votes and add rank
        const sortedResults = categoryData.results
            .sort((a, b) => b.vote_count - a.vote_count);

        sortedResults.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';

            // Mark winner (first place)
            if (index === 0 && result.vote_count > 0) {
                resultItem.classList.add('winner');
            }

            resultItem.innerHTML = `
                <div class="result-rank">
                    ${index === 0 && result.vote_count > 0 ? '🏆' : `#${index + 1}`}
                </div>
                <img src="${API_BASE_URL}${result.photo_url}" alt="${result.costume_name}" class="result-photo">
                <div class="result-info">
                    <h3>${result.name}</h3>
                    <p>${result.costume_name}</p>
                </div>
                <div class="result-votes">
                    ${result.vote_count} vote${result.vote_count !== 1 ? 's' : ''}
                </div>
            `;

            resultsList.appendChild(resultItem);
        });

        categoryDiv.appendChild(resultsList);
        container.appendChild(categoryDiv);
    });
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Cleanup interval on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
