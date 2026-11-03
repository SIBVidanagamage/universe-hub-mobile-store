/**
 * Universe Hub - Direct Drag & Drop Media Uploader
 * Handles direct PNG/JPEG/WEBP image uploads and MP4/WebM video uploads
 * Supports multi-image gallery, primary thumbnail selection, and server streaming
 */

const MediaUploader = {
  // State for Add Product Form ('adm') and Edit Product Modal ('edit')
  state: {
    adm: {
      images: [], // { id, url, name, sizeStr, isUploading }
      video: null  // { url, name, sizeStr, isUploading } or null
    },
    edit: {
      images: [],
      video: null
    }
  },

  init() {
    this.setupDropzone('adm', 'images');
    this.setupDropzone('adm', 'video');
    this.setupDropzone('edit', 'images');
    this.setupDropzone('edit', 'video');

    // Clipboard paste support
    window.addEventListener('paste', (e) => this.handleGlobalPaste(e));
  },

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  // Setup drag & drop and file input events for a dropzone
  setupDropzone(formType, mediaType) {
    const dropzone = document.getElementById(`${formType}-${mediaType}-dropzone`);
    const fileInput = document.getElementById(`${formType}-${mediaType}-input`);

    if (!dropzone || !fileInput) return;

    // Click on dropzone opens native file picker
    dropzone.addEventListener('click', (e) => {
      // Don't trigger if clicked on an inner button or input
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
        fileInput.click();
      }
    });

    // File Input change
    fileInput.addEventListener('change', (e) => {
      if (fileInput.files && fileInput.files.length > 0) {
        this.handleFilesSelected(formType, mediaType, Array.from(fileInput.files));
        fileInput.value = ''; // Reset so the same file can be re-selected if needed
      }
    });

    // Drag events
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'dragend'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.handleFilesSelected(formType, mediaType, Array.from(e.dataTransfer.files));
      }
    });
  },

  // Process files selected via drag & drop or file picker
  async handleFilesSelected(formType, mediaType, files) {
    if (mediaType === 'images') {
      const validImages = files.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name));
      if (validImages.length === 0) {
        if (typeof showToast === 'function') showToast('Please drop valid image files (PNG, JPG, WEBP).');
        return;
      }

      for (const file of validImages) {
        const tempId = 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const tempBlobUrl = URL.createObjectURL(file);

        const imgItem = {
          id: tempId,
          url: tempBlobUrl,
          name: file.name,
          sizeStr: this.formatBytes(file.size),
          dims: 'Detecting...',
          isUploading: true
        };

        const probe = new Image();
        probe.onload = () => {
          imgItem.dims = `${probe.naturalWidth} × ${probe.naturalHeight} px`;
          this.renderImages(formType);
        };
        probe.src = tempBlobUrl;

        this.state[formType].images.push(imgItem);
        this.renderImages(formType);

        // Upload directly to server in background
        this.uploadFile(file)
          .then(serverUrl => {
            imgItem.url = serverUrl;
            imgItem.isUploading = false;
            this.renderImages(formType);
          })
          .catch(err => {
            console.warn('Server upload failed, converting to DataURL fallback:', err);
            this.fileToDataUrl(file).then(dataUrl => {
              imgItem.url = dataUrl;
              imgItem.isUploading = false;
              this.renderImages(formType);
            });
          });
      }

      if (typeof showToast === 'function') {
        showToast(`Added ${validImages.length} photo${validImages.length > 1 ? 's' : ''}!`);
      }
    } else if (mediaType === 'video') {
      const videoFile = files.find(f => f.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(f.name));
      if (!videoFile) {
        if (typeof showToast === 'function') showToast('Please drop a valid video file (MP4, WebM, MOV).');
        return;
      }

      const tempBlobUrl = URL.createObjectURL(videoFile);
      const videoItem = {
        url: tempBlobUrl,
        name: videoFile.name,
        sizeStr: this.formatBytes(videoFile.size),
        isUploading: true
      };

      this.state[formType].video = videoItem;
      this.renderVideo(formType);

      if (typeof showToast === 'function') {
        showToast(`Uploading video "${videoFile.name}"...`);
      }

      this.uploadFile(videoFile)
        .then(serverUrl => {
          videoItem.url = serverUrl;
          videoItem.isUploading = false;
          this.renderVideo(formType);
          if (typeof showToast === 'function') {
            showToast(`Video uploaded successfully!`);
          }
        })
        .catch(err => {
          console.warn('Video upload to server failed:', err);
          videoItem.url = tempBlobUrl;
          videoItem.isUploading = false;
          this.renderVideo(formType);
        });
    }
  },

  // Upload file stream directly to Node server
  async uploadFile(file) {
    const url = `/api/upload?filename=${encodeURIComponent(file.name)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });

    if (!response.ok) {
      throw new Error(`Upload failed with HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.success && json.url) {
      return json.url;
    }
    throw new Error(json.error || 'Upload error');
  },

  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Handle global paste (e.g. user takes screenshot and pastes in Admin)
  handleGlobalPaste(e) {
    const activeModal = document.getElementById('admin-edit-product-modal');
    const isEditOpen = activeModal && activeModal.classList.contains('active');
    const formType = isEditOpen ? 'edit' : 'adm';

    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      this.handleFilesSelected(formType, 'images', files);
    }
  },

  // Render Image Thumbnails Grid
  renderImages(formType) {
    const grid = document.getElementById(`${formType}-images-preview-grid`);
    const badge = document.getElementById(`${formType}-images-count-badge`);
    const images = this.state[formType].images;

    if (badge) {
      badge.textContent = `${images.length} photo${images.length !== 1 ? 's' : ''} added`;
    }

    if (!grid) return;

    if (images.length === 0) {
      grid.innerHTML = '';
      return;
    }

    grid.innerHTML = images.map((img, index) => {
      const isPrimary = index === 0;
      return `
        <div class="uploaded-preview-item ${isPrimary ? 'is-primary' : ''}">
          <img src="${img.url}" alt="${img.name || 'Product Image'}" onerror="this.src='assets/hero_showcase.jpg'">
          ${isPrimary ? `<span class="uploaded-primary-badge">⭐ Primary Cover</span>` : ''}
          ${img.dims ? `<span class="uploaded-dims-badge">📐 ${img.dims}</span>` : ''}
          <button type="button" class="uploaded-remove-btn" title="Remove photo" onclick="MediaUploader.removeImage('${formType}', ${index})">✕</button>
          ${!isPrimary ? `<button type="button" class="uploaded-make-primary-btn" onclick="MediaUploader.makePrimary('${formType}', ${index})">Make Cover</button>` : ''}
          ${img.isUploading ? `
            <div class="uploaded-uploading-overlay">
              <span class="spinner-border" style="width:18px; height:18px; border-width:2px;"></span>
              <span>Uploading...</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  // Render Video Preview Card
  renderVideo(formType) {
    const card = document.getElementById(`${formType}-video-preview-card`);
    const dropzone = document.getElementById(`${formType}-video-dropzone`);
    const badge = document.getElementById(`${formType}-video-count-badge`);
    const video = this.state[formType].video;

    if (!card || !dropzone) return;

    if (!video || !video.url) {
      card.style.display = 'none';
      card.innerHTML = '';
      dropzone.style.display = 'block';
      if (badge) {
        badge.textContent = 'No video selected';
        badge.classList.remove('has-video');
      }
      return;
    }

    // Video exists -> show preview card and hide dropzone
    dropzone.style.display = 'none';
    card.style.display = 'flex';
    if (badge) {
      badge.textContent = '🎬 1 Video Attached';
      badge.classList.add('has-video');
    }

    const isYouTube = video.url.includes('youtube.com') || video.url.includes('youtu.be');

    let playerHtml = '';
    if (isYouTube) {
      playerHtml = `<iframe style="width:100%; height:100%; border:0;" src="${video.url.replace('watch?v=', 'embed/')}" allowfullscreen></iframe>`;
    } else {
      playerHtml = `
        <video controls playsinline preload="metadata">
          <source src="${video.url}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      `;
    }

    card.innerHTML = `
      <div class="uploaded-video-player-box">
        ${playerHtml}
      </div>
      <div class="uploaded-video-info">
        <div class="uploaded-video-title" title="${video.name || video.url}">
          ${video.name || 'Product Video Showcase'}
        </div>
        <div class="uploaded-video-meta">
          <span style="color:var(--neon-cyan); font-weight:700;">MP4 / Video</span>
          <span>•</span>
          <span>${video.sizeStr || 'Ready for playback'}</span>
          ${video.isUploading ? `<span style="color:#e056fd;">• Uploading...</span>` : `<span style="color:var(--success);">• ✓ Ready</span>`}
        </div>
        <div class="uploaded-video-actions">
          <button type="button" class="btn-remove-video" onclick="MediaUploader.removeVideo('${formType}')">
            ✕ Remove / Replace Video
          </button>
        </div>
      </div>
    `;
  },

  // Actions
  removeImage(formType, index) {
    this.state[formType].images.splice(index, 1);
    this.renderImages(formType);
    if (typeof showToast === 'function') showToast('Photo removed.');
  },

  makePrimary(formType, index) {
    if (index > 0 && index < this.state[formType].images.length) {
      const item = this.state[formType].images.splice(index, 1)[0];
      this.state[formType].images.unshift(item);
      this.renderImages(formType);
      if (typeof showToast === 'function') showToast(`"${item.name || 'Photo'}" set as primary cover!`);
    }
  },

  removeVideo(formType) {
    this.state[formType].video = null;
    this.renderVideo(formType);
    if (typeof showToast === 'function') showToast('Video removed.');
  },

  // URL fallback box helpers
  toggleUrlBox(boxId) {
    const box = document.getElementById(boxId);
    if (box) {
      box.style.display = box.style.display === 'none' ? 'flex' : 'none';
    }
  },

  addImagesFromUrl(formType) {
    const textarea = document.getElementById(formType === 'adm' ? 'adm-prod-image' : 'edit-prod-images');
    if (!textarea) return;
    const raw = textarea.value.trim();
    if (!raw) return;

    const urls = raw.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
    urls.forEach((url, i) => {
      this.state[formType].images.push({
        id: 'url-' + Date.now() + '-' + i,
        url: url,
        name: url.split('/').pop().split('?')[0] || `Image ${this.state[formType].images.length + 1}`,
        sizeStr: 'Web Link',
        isUploading: false
      });
    });

    textarea.value = '';
    this.renderImages(formType);
    if (typeof showToast === 'function') showToast(`Added ${urls.length} image URL${urls.length > 1 ? 's' : ''}!`);
  },

  setVideoFromUrl(formType) {
    const input = document.getElementById(formType === 'adm' ? 'adm-prod-video' : 'edit-prod-video');
    if (!input) return;
    const url = input.value.trim();
    if (!url) return;

    this.state[formType].video = {
      url: url,
      name: url.split('/').pop().split('?')[0] || 'Web Video Link',
      sizeStr: 'Web Stream',
      isUploading: false
    };

    input.value = '';
    this.renderVideo(formType);
    if (typeof showToast === 'function') showToast('Video link set!');
  },

  // Getters for saving
  getImages(formType) {
    const list = this.state[formType].images.map(img => img.url).filter(u => !!u);
    // Also check if user typed anything in manual textarea
    const textarea = document.getElementById(formType === 'adm' ? 'adm-prod-image' : 'edit-prod-images');
    if (textarea && textarea.value.trim()) {
      const extra = textarea.value.trim().split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
      list.push(...extra);
    }
    return list.length > 0 ? list : ['assets/hero_showcase.jpg'];
  },

  getVideo(formType) {
    if (this.state[formType].video && this.state[formType].video.url) {
      return this.state[formType].video.url;
    }
    const input = document.getElementById(formType === 'adm' ? 'adm-prod-video' : 'edit-prod-video');
    return input ? input.value.trim() : '';
  },

  // Setters for populating edit modal
  setImages(formType, urls) {
    this.state[formType].images = (urls || []).map((url, i) => {
      const item = {
        id: 'exist-' + Date.now() + '-' + i,
        url: url,
        name: url.split('/').pop().split('?')[0] || `Image ${i + 1}`,
        sizeStr: url.startsWith('/uploads/') ? 'Stored on Server' : 'Web Asset',
        dims: '',
        isUploading: false
      };
      const probe = new Image();
      probe.onload = () => {
        item.dims = `${probe.naturalWidth} × ${probe.naturalHeight} px`;
        this.renderImages(formType);
      };
      probe.src = url;
      return item;
    });
    this.renderImages(formType);
  },

  setVideo(formType, videoUrl) {
    if (videoUrl && videoUrl.trim()) {
      this.state[formType].video = {
        url: videoUrl.trim(),
        name: videoUrl.split('/').pop().split('?')[0] || 'Product Video',
        sizeStr: videoUrl.startsWith('/uploads/') ? 'Stored on Server' : 'Video Stream',
        isUploading: false
      };
    } else {
      this.state[formType].video = null;
    }
    this.renderVideo(formType);
  },

  // Reset form
  reset(formType) {
    this.state[formType].images = [];
    this.state[formType].video = null;
    this.renderImages(formType);
    this.renderVideo(formType);

    const textarea = document.getElementById(formType === 'adm' ? 'adm-prod-image' : 'edit-prod-images');
    if (textarea) textarea.value = '';
    const videoInput = document.getElementById(formType === 'adm' ? 'adm-prod-video' : 'edit-prod-video');
    if (videoInput) videoInput.value = '';
  }
};

// Explicitly bind to window & module.exports for inline HTML onclicks and cross-script calls
if (typeof window !== 'undefined') {
  window.MediaUploader = MediaUploader;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MediaUploader;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MediaUploader.init());
} else {
  MediaUploader.init();
}
