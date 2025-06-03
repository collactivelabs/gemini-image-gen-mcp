
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const imageForm = document.getElementById('imageForm');
    const promptInput = document.getElementById('prompt');
    const modelSelect = document.getElementById('model');
    const temperatureInput = document.getElementById('temperature');
    const temperatureValue = document.getElementById('temperatureValue');
    const topPInput = document.getElementById('topP');
    const topPValue = document.getElementById('topPValue');
    const topKInput = document.getElementById('topK');
    const topKValue = document.getElementById('topKValue');
    const saveCheckbox = document.getElementById('save');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const imageContainer = document.getElementById('imageContainer');
    const resultDetails = document.getElementById('resultDetails');
    const originalPromptEl = document.getElementById('originalPrompt');
    const enhancedPromptEl = document.getElementById('enhancedPrompt');
    const galleryContainer = document.getElementById('galleryContainer');
    const galleryTab = document.getElementById('gallery-tab');
    const modalImage = document.getElementById('modalImage');

    // Input range value display
    temperatureInput.addEventListener('input', () => {
        temperatureValue.textContent = temperatureInput.value;
    });

    topPInput.addEventListener('input', () => {
        topPValue.textContent = topPInput.value;
    });

    topKInput.addEventListener('input', () => {
        topKValue.textContent = topKInput.value;
    });

    // Sample prompts
    document.querySelectorAll('.sample-prompt').forEach(button => {
        button.addEventListener('click', () => {
            promptInput.value = button.textContent;
        });
    });

    // Form submission
    imageForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Show loading spinner
        loadingSpinner.style.display = 'block';
        imageContainer.innerHTML = '';
        resultDetails.style.display = 'none';

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: promptInput.value,
                    model: modelSelect.value,
                    temperature: parseFloat(temperatureInput.value),
                    topP: parseFloat(topPInput.value),
                    topK: parseInt(topKInput.value),
                    save: saveCheckbox.checked
                })
            });

            const data = await response.json();

            if (data.success) {
                // Display the image
                const img = document.createElement('img');
                img.src = data.result.image_path;
                img.alt = 'Generated image';
                img.classList.add('generated-image');
                imageContainer.innerHTML = '';
                imageContainer.appendChild(img);

                // Display result details
                originalPromptEl.textContent = data.result.prompt;
                enhancedPromptEl.textContent = data.result.enhanced_prompt || 'No enhanced prompt available';
                resultDetails.style.display = 'block';

                // Add success message
                const alert = document.createElement('div');
                alert.className = 'alert alert-success';
                alert.textContent = 'Image generated successfully!';

                // If there was an error but we still got a fallback image
                if (data.result.error) {
                    alert.className = 'alert alert-warning';
                    alert.textContent = `Note: ${data.result.error} (Using fallback image)`;
                }

                imageContainer.prepend(alert);

                // Automatically remove alert after 3 seconds
                setTimeout(() => {
                    alert.remove();
                }, 3000);
            } else {
                // Display error
                imageContainer.innerHTML = `<div class="alert alert-danger">${data.error || 'An error occurred'}</div>`;
            }
        } catch (error) {
            console.error('Error:', error);
            imageContainer.innerHTML = `<div class="alert alert-danger">Failed to generate image: ${error.message}</div>`;
        } finally {
            // Hide loading spinner
            loadingSpinner.style.display = 'none';
        }
    });

    // Load gallery images
    async function loadGallery() {
        try {
            const response = await fetch('/api/images');
            const data = await response.json();

            if (data.success) {
                if (data.images.length === 0) {
                    galleryContainer.innerHTML = '<p class="text-center">No images generated yet.</p>';
                    return;
                }

                galleryContainer.innerHTML = '';

                data.images.forEach(image => {
                    const col = document.createElement('div');
                    col.className = 'col-md-4 col-sm-6 mb-4';

                    col.innerHTML = `
                        <div class="card">
                            <img src="${image}" alt="Generated image" class="gallery-image" data-bs-toggle="modal" data-bs-target="#imageModal">
                            <div class="card-footer text-center">
                                <a href="${image}" class="btn btn-sm btn-outline-primary" target="_blank">View Full Size</a>
                            </div>
                        </div>
                    `;

                    galleryContainer.appendChild(col);

                    // Add click event to show in modal
                    const img = col.querySelector('.gallery-image');
                    img.addEventListener('click', () => {
                        modalImage.src = image;
                    });
                });
            } else {
                galleryContainer.innerHTML = `<div class="alert alert-danger">${data.error || 'An error occurred loading gallery'}</div>`;
            }
        } catch (error) {
            console.error('Error loading gallery:', error);
            galleryContainer.innerHTML = `<div class="alert alert-danger">Failed to load gallery: ${error.message}</div>`;
        }
    }

    // Load gallery when tab is shown
    galleryTab.addEventListener('shown.bs.tab', loadGallery);

    // Initial load if gallery is the active tab
    if (galleryTab.classList.contains('active')) {
        loadGallery();
    }
});