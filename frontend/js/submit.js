// Submission form logic

const form = document.getElementById('submitForm');
const photoInput = document.getElementById('photo');
const previewContainer = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const submitBtn = document.getElementById('submitBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const uploadProgress = document.getElementById('uploadProgress');

// Preview image when selected
photoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];

    if (file) {
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('File is too large. Maximum size is 5MB.');
            photoInput.value = '';
            previewContainer.style.display = 'none';
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showError('Invalid file type. Please upload a JPG, PNG, GIF, or WEBP image.');
            photoInput.value = '';
            previewContainer.style.display = 'none';
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);

        hideError();
    }
});

// Handle form submission
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const costumeName = document.getElementById('costumeName').value.trim();
    const photo = photoInput.files[0];

    // Validate
    if (!name || !costumeName || !photo) {
        showError('Please fill in all fields and select a photo.');
        return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    uploadProgress.style.display = 'block';
    hideError();
    hideSuccess();

    try {
        // Create FormData
        const formData = new FormData();
        formData.append('name', name);
        formData.append('costume_name', costumeName);
        formData.append('photo', photo);

        // Submit to API
        const response = await fetch(`${API_BASE_URL}/api/entries`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to submit entry');
        }

        const data = await response.json();

        // Success!
        uploadProgress.style.display = 'none';
        showSuccess(`🎉 Entry submitted successfully! Your costume "${costumeName}" has been added to the contest.`);

        // Reset form
        form.reset();
        previewContainer.style.display = 'none';
        submitBtn.textContent = 'Submit Entry';
        submitBtn.disabled = false;

        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error submitting entry:', error);
        uploadProgress.style.display = 'none';
        showError(`Failed to submit entry: ${error.message}`);
        submitBtn.textContent = 'Submit Entry';
        submitBtn.disabled = false;
    }
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
}

function hideSuccess() {
    successMessage.style.display = 'none';
}
