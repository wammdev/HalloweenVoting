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

        // Load votes (grouped by voter)
        const votesResponse = await fetch(`${API_BASE_URL}/api/admin/votes-grouped?password=${encodeURIComponent(adminPassword)}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        votes = await votesResponse.json();

        // Load MC votes (grouped by voter)
        const mcVotesResponse = await fetch(`${API_BASE_URL}/api/admin/mc-votes-grouped?password=${encodeURIComponent(adminPassword)}`, {
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

    // Sum up vote counts from grouped data
    const totalVotes = votes.reduce((sum, v) => sum + v.vote_count, 0);
    const totalMcVotes = mcVotes.reduce((sum, v) => sum + v.vote_count, 0);

    document.getElementById('totalVotes').textContent = totalVotes;
    document.getElementById('totalMcVotes').textContent = totalMcVotes;

    const deletedCount =
        entries.filter(e => e.deleted).length +
        votes.filter(v => v.has_deleted).length +
        mcVotes.filter(v => v.has_deleted).length;

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
    html += '<th>Voted In</th>';
    html += '<th>Count</th>';
    html += '<th>Status</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';

    votes.forEach(vote => {
        // Determine row status based on deletion state
        const rowClass = vote.all_deleted ? 'deleted-row' : '';
        let statusClass, statusText;

        if (vote.all_deleted) {
            statusClass = 'status-deleted';
            statusText = 'Deleted';
        } else if (vote.has_deleted) {
            statusClass = 'status-active';
            statusText = 'Partial';
        } else {
            statusClass = 'status-active';
            statusText = 'Active';
        }

        const voterId = vote.voter_id ? vote.voter_id.substring(0, 12) + '...' : 'Anonymous';
        const fullVoterId = vote.voter_id || 'Anonymous';

        html += `<tr class="${rowClass}">`;
        html += `<td title="${escapeHtml(fullVoterId)}">${escapeHtml(voterId)}</td>`;
        html += `<td>${escapeHtml(vote.categories || 'Unknown')}</td>`;
        html += `<td>${vote.vote_count}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${statusText}</span></td>`;
        html += '<td><div class="admin-actions">';

        if (vote.all_deleted) {
            html += `<button class="btn btn-restore btn-small" onclick="restoreVotesByVoter('${escapeHtml(fullVoterId)}')">Restore All</button>`;
        } else {
            html += `<button class="btn btn-delete btn-small" onclick="deleteVotesByVoter('${escapeHtml(fullVoterId)}')">Delete All</button>`;
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
    html += '<th>Voted In</th>';
    html += '<th>Count</th>';
    html += '<th>Status</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';

    mcVotes.forEach(vote => {
        // Determine row status based on deletion state
        const rowClass = vote.all_deleted ? 'deleted-row' : '';
        let statusClass, statusText;

        if (vote.all_deleted) {
            statusClass = 'status-deleted';
            statusText = 'Deleted';
        } else if (vote.has_deleted) {
            statusClass = 'status-active';
            statusText = 'Partial';
        } else {
            statusClass = 'status-active';
            statusText = 'Active';
        }

        const voterId = vote.voter_id ? vote.voter_id.substring(0, 12) + '...' : 'Anonymous';
        const fullVoterId = vote.voter_id || 'Anonymous';

        html += `<tr class="${rowClass}">`;
        html += `<td title="${escapeHtml(fullVoterId)}">${escapeHtml(voterId)}</td>`;
        html += `<td>${escapeHtml(vote.questions || 'Unknown')}</td>`;
        html += `<td>${vote.vote_count}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${statusText}</span></td>`;
        html += '<td><div class="admin-actions">';

        if (vote.all_deleted) {
            html += `<button class="btn btn-restore btn-small" onclick="restoreMcVotesByVoter('${escapeHtml(fullVoterId)}')">Restore All</button>`;
        } else {
            html += `<button class="btn btn-delete btn-small" onclick="deleteMcVotesByVoter('${escapeHtml(fullVoterId)}')">Delete All</button>`;
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

// Delete all votes by voter
async function deleteVotesByVoter(voterId) {
    if (!confirm('Are you sure you want to delete ALL votes from this voter?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/votes/voter/${encodeURIComponent(voterId)}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to delete votes');
        }

        // Reload data
        await loadAdminData();

    } catch (error) {
        console.error('Error deleting votes:', error);
        alert('Failed to delete votes: ' + error.message);
    }
}

// Restore all votes by voter
async function restoreVotesByVoter(voterId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/votes/voter/${encodeURIComponent(voterId)}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to restore votes');
        }

        // Reload data
        await loadAdminData();

    } catch (error) {
        console.error('Error restoring votes:', error);
        alert('Failed to restore votes: ' + error.message);
    }
}

// Delete all MC votes by voter
async function deleteMcVotesByVoter(voterId) {
    if (!confirm('Are you sure you want to delete ALL MC votes from this voter?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/mc-votes/voter/${encodeURIComponent(voterId)}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to delete MC votes');
        }

        // Reload data
        await loadAdminData();

    } catch (error) {
        console.error('Error deleting MC votes:', error);
        alert('Failed to delete MC votes: ' + error.message);
    }
}

// Restore all MC votes by voter
async function restoreMcVotesByVoter(voterId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/mc-votes/voter/${encodeURIComponent(voterId)}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to restore MC votes');
        }

        // Reload data
        await loadAdminData();

    } catch (error) {
        console.error('Error restoring MC votes:', error);
        alert('Failed to restore MC votes: ' + error.message);
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
