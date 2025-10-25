// Admin panel logic

let adminPassword = '';
let entries = [];
let votes = [];
let mcVotes = [];
let refreshInterval = null;

// Password form submission
document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    try {
        // Verify admin password
        const response = await fetch(`${API_BASE_URL}/api/admin/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password })
        });

        if (!response.ok) {
            throw new Error('Invalid admin password');
        }

        // Password is correct
        adminPassword = password;

        // Hide password prompt, show admin panel
        document.getElementById('passwordPrompt').style.display = 'none';
        document.getElementById('adminDisplay').style.display = 'block';

        // Load admin data
        await loadAdminData();

        // Set up auto-refresh every 30 seconds
        refreshInterval = setInterval(loadAdminData, 30000);

    } catch (error) {
        console.error('Authentication error:', error);
        errorDiv.textContent = 'Invalid admin password. Please try again.';
        errorDiv.style.display = 'block';
    }
});

// Load all admin data
async function loadAdminData() {
    try {
        // Load entries
        const entriesResponse = await fetch(`${API_BASE_URL}/api/admin/entries?password=${encodeURIComponent(adminPassword)}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        entries = await entriesResponse.json();

        // Load votes
        const votesResponse = await fetch(`${API_BASE_URL}/api/admin/votes?password=${encodeURIComponent(adminPassword)}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        votes = await votesResponse.json();

        // Load MC votes
        const mcVotesResponse = await fetch(`${API_BASE_URL}/api/admin/mc-votes?password=${encodeURIComponent(adminPassword)}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        mcVotes = await mcVotesResponse.json();

        // Update statistics
        updateStatistics();

        // Render tables
        renderEntries();
        renderVotes();
        renderMcVotes();

    } catch (error) {
        console.error('Error loading admin data:', error);
        showError('Failed to load admin data: ' + error.message);
    }
}

// Update statistics
function updateStatistics() {
    document.getElementById('totalEntries').textContent = entries.length;
    document.getElementById('totalVotes').textContent = votes.length;
    document.getElementById('totalMcVotes').textContent = mcVotes.length;

    const deletedCount =
        entries.filter(e => e.deleted).length +
        votes.filter(v => v.deleted).length +
        mcVotes.filter(v => v.deleted).length;

    document.getElementById('deletedItems').textContent = deletedCount;
}

// Render entries table
function renderEntries() {
    const container = document.getElementById('entriesContainer');

    if (entries.length === 0) {
        container.innerHTML = '<p style="padding: 1rem; text-align: center;">No entries found</p>';
        return;
    }

    let html = '<table><thead><tr>';
    html += '<th>Photo</th>';
    html += '<th>Name</th>';
    html += '<th>Costume</th>';
    html += '<th>Created</th>';
    html += '<th>Status</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';

    entries.forEach(entry => {
        const rowClass = entry.deleted ? 'deleted-row' : '';
        const statusClass = entry.deleted ? 'status-deleted' : 'status-active';
        const statusText = entry.deleted ? 'Deleted' : 'Active';
        const date = new Date(entry.created_at).toLocaleString();

        html += `<tr class="${rowClass}">`;
        html += `<td><img src="${API_BASE_URL}${entry.photo_url}" alt="${entry.costume_name}" id="entry-img-${entry.id}"></td>`;
        html += `<td>${escapeHtml(entry.name)}</td>`;
        html += `<td>${escapeHtml(entry.costume_name)}</td>`;
        html += `<td>${date}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${statusText}</span></td>`;
        html += '<td><div class="admin-actions">';

        if (entry.deleted) {
            html += `<button class="btn btn-restore btn-small" onclick="restoreEntry('${entry.id}')">Restore</button>`;
        } else {
            html += `<button class="btn btn-delete btn-small" onclick="deleteEntry('${entry.id}')">Delete</button>`;
        }

        html += '</div></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Load images with headers
    entries.forEach(entry => {
        const imgElement = document.getElementById(`entry-img-${entry.id}`);
        if (imgElement) {
            loadImageWithHeaders(`${API_BASE_URL}${entry.photo_url}`).then(blobUrl => {
                imgElement.src = blobUrl;
            }).catch(err => {
                console.error('Failed to load image:', err);
            });
        }
    });
}

// Render votes table
function renderVotes() {
    const container = document.getElementById('votesContainer');

    if (votes.length === 0) {
        container.innerHTML = '<p style="padding: 1rem; text-align: center;">No votes found</p>';
        return;
    }

    let html = '<table><thead><tr>';
    html += '<th>Voter ID</th>';
    html += '<th>Category</th>';
    html += '<th>Entry</th>';
    html += '<th>Costume</th>';
    html += '<th>Created</th>';
    html += '<th>Status</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';

    votes.forEach(vote => {
        const rowClass = vote.deleted ? 'deleted-row' : '';
        const statusClass = vote.deleted ? 'status-deleted' : 'status-active';
        const statusText = vote.deleted ? 'Deleted' : 'Active';
        const date = new Date(vote.created_at).toLocaleString();
        const voterId = vote.voter_id ? vote.voter_id.substring(0, 12) + '...' : 'Anonymous';

        html += `<tr class="${rowClass}">`;
        html += `<td title="${escapeHtml(vote.voter_id || 'Anonymous')}">${escapeHtml(voterId)}</td>`;
        html += `<td>${escapeHtml(vote.category)}</td>`;
        html += `<td>${escapeHtml(vote.entry_name || 'Unknown')}</td>`;
        html += `<td>${escapeHtml(vote.costume_name || 'Unknown')}</td>`;
        html += `<td>${date}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${statusText}</span></td>`;
        html += '<td><div class="admin-actions">';

        if (vote.deleted) {
            html += `<button class="btn btn-restore btn-small" onclick="restoreVote('${vote.id}')">Restore</button>`;
        } else {
            html += `<button class="btn btn-delete btn-small" onclick="deleteVote('${vote.id}')">Delete</button>`;
        }

        html += '</div></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Render MC votes table
function renderMcVotes() {
    const container = document.getElementById('mcVotesContainer');

    if (mcVotes.length === 0) {
        container.innerHTML = '<p style="padding: 1rem; text-align: center;">No MC votes found</p>';
        return;
    }

    let html = '<table><thead><tr>';
    html += '<th>Voter ID</th>';
    html += '<th>Question</th>';
    html += '<th>Answer</th>';
    html += '<th>Created</th>';
    html += '<th>Status</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';

    mcVotes.forEach(vote => {
        const rowClass = vote.deleted ? 'deleted-row' : '';
        const statusClass = vote.deleted ? 'status-deleted' : 'status-active';
        const statusText = vote.deleted ? 'Deleted' : 'Active';
        const date = new Date(vote.created_at).toLocaleString();
        const voterId = vote.voter_id ? vote.voter_id.substring(0, 12) + '...' : 'Anonymous';

        html += `<tr class="${rowClass}">`;
        html += `<td title="${escapeHtml(vote.voter_id || 'Anonymous')}">${escapeHtml(voterId)}</td>`;
        html += `<td>${escapeHtml(vote.question || 'Unknown')}</td>`;
        html += `<td>${escapeHtml(vote.option_text || 'Unknown')}</td>`;
        html += `<td>${date}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${statusText}</span></td>`;
        html += '<td><div class="admin-actions">';

        if (vote.deleted) {
            html += `<button class="btn btn-restore btn-small" onclick="restoreMcVote('${vote.id}')">Restore</button>`;
        } else {
            html += `<button class="btn btn-delete btn-small" onclick="deleteMcVote('${vote.id}')">Delete</button>`;
        }

        html += '</div></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Delete entry
async function deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry? It will be hidden from all views.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/entries/${entryId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to delete entry');
        }

        // Reload data
        await loadAdminData();

    } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Failed to delete entry: ' + error.message);
    }
}

// Restore entry
async function restoreEntry(entryId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/entries/${entryId}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to restore entry');
        }

        // Reload data
        await loadAdminData();

    } catch (error) {
        console.error('Error restoring entry:', error);
        alert('Failed to restore entry: ' + error.message);
    }
}

// Delete vote
async function deleteVote(voteId) {
    if (!confirm('Are you sure you want to delete this vote?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/votes/${voteId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to delete vote');
        }

        // Reload data
        await loadAdminData();

    } catch (error) {
        console.error('Error deleting vote:', error);
        alert('Failed to delete vote: ' + error.message);
    }
}

// Restore vote
async function restoreVote(voteId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/votes/${voteId}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to restore vote');
        }

        // Reload data
        await loadAdminData();

    } catch (error) {
        console.error('Error restoring vote:', error);
        alert('Failed to restore vote: ' + error.message);
    }
}

// Delete MC vote
async function deleteMcVote(voteId) {
    if (!confirm('Are you sure you want to delete this MC vote?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/mc-votes/${voteId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to delete MC vote');
        }

        // Reload data
        await loadAdminData();

    } catch (error) {
        console.error('Error deleting MC vote:', error);
        alert('Failed to delete MC vote: ' + error.message);
    }
}

// Restore MC vote
async function restoreMcVote(voteId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/mc-votes/${voteId}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to restore MC vote');
        }

        // Reload data
        await loadAdminData();

    } catch (error) {
        console.error('Error restoring MC vote:', error);
        alert('Failed to restore MC vote: ' + error.message);
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    alert(message);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
