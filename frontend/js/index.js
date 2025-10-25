// Home page - Load and display categories dynamically

// Category icons mapping
const CATEGORY_ICONS = {
    'scaries': '👻',
    'scariest': '👻',
    'original': '🎨',
    'most_creative': '🎨',
    'creative': '🎨',
    'couples': '💑',
    'funniest': '😂',
    'funny': '😂',
    'nontheme': '🎭',
    'best_group': '👥',
    'group': '👥'
};

// Get icon for category, default to 🎃 if not found
function getCategoryIcon(categoryId) {
    const id = categoryId.toLowerCase();
    return CATEGORY_ICONS[id] || '🎃';
}

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load categories');
        }

        const categories = await response.json();
        displayCategories(categories);

    } catch (error) {
        console.error('Error loading categories:', error);
        // Show fallback message
        const categoryList = document.getElementById('categoryList');
        categoryList.innerHTML = '<li>Categories will be available when voting opens!</li>';
    }
}

// Display categories in the list
function displayCategories(categories) {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';

    // Sort by order
    categories.sort((a, b) => a.order - b.order);

    categories.forEach(category => {
        const li = document.createElement('li');
        const icon = getCategoryIcon(category.id);
        li.innerHTML = `${icon} <strong>${category.name}</strong>`;
        categoryList.appendChild(li);
    });
}

// Load categories when page loads
document.addEventListener('DOMContentLoaded', loadCategories);
