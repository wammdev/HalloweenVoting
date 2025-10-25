// Results page logic

let currentPassword = null;
let refreshInterval = null;

// Helper function to calculate ranks with tie support
function calculateRanksWithTies(items) {
    let currentRank = 1;
    let previousVotes = null;

    return items.map((item, index) => {
        if (previousVotes !== null && item.vote_count < previousVotes) {
            currentRank = index + 1;
        }
        previousVotes = item.vote_count;
        return { ...item, rank: currentRank };
    });
}

// Helper function to filter to only top 3 ranks
function filterTopThreeRanks(rankedItems) {
    return rankedItems.filter(item => item.rank <= 3);
}

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
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
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

    // Render costume category results
    if (results.category_results) {
        results.category_results.forEach(categoryData => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'results-category';

            const categoryTitle = document.createElement('h2');
            categoryTitle.textContent = categoryData.category;
            categoryDiv.appendChild(categoryTitle);

            const resultsList = document.createElement('div');
            resultsList.className = 'results-list';

            // Sort by votes, calculate ranks, and filter to top 3
            const sortedResults = categoryData.results
                .sort((a, b) => b.vote_count - a.vote_count);

            const rankedResults = calculateRanksWithTies(sortedResults);
            const topThreeResults = filterTopThreeRanks(rankedResults);

            topThreeResults.forEach(async (result) => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';

                // Mark winner (rank 1, could be multiple if tied)
                if (result.rank === 1 && result.vote_count > 0) {
                    resultItem.classList.add('winner');
                }

                // Create rank element
                const rankDiv = document.createElement('div');
                rankDiv.className = 'result-rank';
                rankDiv.innerHTML = result.rank === 1 && result.vote_count > 0 ? '🏆' : `#${result.rank}`;

                // Create image element with loading state
                const img = document.createElement('img');
                img.className = 'result-photo';
                img.alt = result.costume_name;
                img.style.opacity = '0.5';
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%232a2a2a" width="80" height="80"/%3E%3C/svg%3E';

                // Load image with proper headers
                const imageUrl = `${API_BASE_URL}${result.photo_url}`;
                loadImageWithHeaders(imageUrl).then(blobUrl => {
                    img.src = blobUrl;
                    img.style.opacity = '1';
                }).catch(err => {
                    console.error('Failed to load image:', err);
                    img.style.opacity = '1';
                });

                // Create info element
                const infoDiv = document.createElement('div');
                infoDiv.className = 'result-info';
                infoDiv.innerHTML = `
                    <h3>${result.name}</h3>
                    <p>${result.costume_name}</p>
                `;

                // Create votes element
                const votesDiv = document.createElement('div');
                votesDiv.className = 'result-votes';
                votesDiv.textContent = `${result.vote_count} vote${result.vote_count !== 1 ? 's' : ''}`;

                // Append all elements
                resultItem.appendChild(rankDiv);
                resultItem.appendChild(img);
                resultItem.appendChild(infoDiv);
                resultItem.appendChild(votesDiv);

                resultsList.appendChild(resultItem);
            });

            categoryDiv.appendChild(resultsList);
            container.appendChild(categoryDiv);
        });
    }

    // Render multiple choice results
    if (results.mc_results && results.mc_results.length > 0) {
        results.mc_results.forEach(mcData => {
            const mcDiv = document.createElement('div');
            mcDiv.className = 'results-category mc-results-category';

            const mcTitle = document.createElement('h2');
            mcTitle.textContent = '📋 ' + mcData.question;
            mcDiv.appendChild(mcTitle);

            const mcResultsList = document.createElement('div');
            mcResultsList.className = 'mc-results-list';

            // Sort by votes, calculate ranks, and filter to top 3
            const sortedOptions = mcData.options
                .sort((a, b) => b.vote_count - a.vote_count);

            const rankedOptions = calculateRanksWithTies(sortedOptions);
            const topThreeOptions = filterTopThreeRanks(rankedOptions);

            // Calculate total votes from ALL options (not just top 3) for accurate percentages
            const totalVotes = mcData.options.reduce((sum, opt) => sum + opt.vote_count, 0);

            topThreeOptions.forEach((option) => {
                const percentage = totalVotes > 0 ? ((option.vote_count / totalVotes) * 100).toFixed(1) : 0;

                const optionItem = document.createElement('div');
                optionItem.className = 'mc-result-item';

                // Mark winner (rank 1, could be multiple if tied)
                if (option.rank === 1 && option.vote_count > 0) {
                    optionItem.classList.add('mc-winner');
                }

                optionItem.innerHTML = `
                    <div class="mc-result-content">
                        <div class="mc-result-rank">
                            ${option.rank === 1 && option.vote_count > 0 ? '🏆' : `#${option.rank}`}
                        </div>
                        <div class="mc-result-text">
                            <strong>${option.option_text}</strong>
                        </div>
                        <div class="mc-result-stats">
                            <span class="mc-vote-count">${option.vote_count} vote${option.vote_count !== 1 ? 's' : ''}</span>
                            <span class="mc-percentage">(${percentage}%)</span>
                        </div>
                    </div>
                    <div class="mc-result-bar">
                        <div class="mc-result-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                `;

                mcResultsList.appendChild(optionItem);
            });

            mcDiv.appendChild(mcResultsList);
            container.appendChild(mcDiv);
        });
    }
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
