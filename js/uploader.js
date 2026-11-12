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

  // Check if any media is still actively processing/compressing
  isProcessing(formType) {
    const images = (this.state && this.state[formType] && this.state[formType].images) || [];
    const video = this.state && this.state[formType] && this.state[formType].video;
    return images.some(img => img.isUploading) || (video && video.isUploading);
  },

  // Client-Side Image Compression & Resizing using HTML5 Canvas
  // Scales down high-res phone camera photos (up to 12MB) to lightweight, fast-loading ~45KB Web/Mobile assets
  compressImageToDataUrl(file, maxWidth = 800, maxHeight = 800, quality = 0.82) {
    return new Promise((resolve) => {
      if (!file || !file.type) return resolve('');
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const tempUrl = URL.createObjectURL(file);
      img.onload = () => {
        try {
          URL.revokeObjectURL(tempUrl);
          let width = img.naturalWidth || img.width || 800;
          let height = img.naturalHeight || img.height || 800;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (file.type === 'image/png') {
              ctx.clearRect(0, 0, width, height);
            } else {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, width, height);
            }
            ctx.drawImage(img, 0, 0, width, height);
            const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            let compressed = canvas.toDataURL(outputFormat, quality);
            // If still larger than 400KB and was PNG, convert to JPEG for safe storage
            if (compressed.length > 400000 && outputFormat === 'image/png') {
              compressed = canvas.toDataURL('image/jpeg', 0.82);
            }
            resolve(compressed);
          } else {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          }
        } catch (err) {
          console.warn('Canvas compression fallback:', err);
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      };
      img.src = tempUrl;
    });
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

        // Compress image immediately to lightweight mobile-optimized asset
        this.compressImageToDataUrl(file).then(compressedUrl => {
          imgItem.url = compressedUrl;
          imgItem.sizeStr = this.formatBytes(Math.round(compressedUrl.length * 0.75));
          imgItem.isUploading = false;
          this.renderImages(formType);
        }).catch(err => {
          console.warn('Image compression fallback:', err);
          imgItem.url = tempBlobUrl;
          imgItem.isUploading = false;
          this.renderImages(formType);
        });
      }

      if (typeof showToast === 'function') {
        showToast(`Added & optimized ${validImages.length} photo${validImages.length > 1 ? 's' : ''}!`);
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
        isUploading: false
      };

      this.state[formType].video = videoItem;
      this.renderVideo(formType);

      if (typeof showToast === 'function') {
        showToast(`🎬 Video "${videoFile.name}" attached successfully!`);
      }
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
    if (!this.state[formType]?.images) return;
    this.state[formType].images.splice(index, 1);
    // Keep manual textarea synchronized so deleted items never get resurrected
    const textarea = document.getElementById(formType === 'adm' ? 'adm-prod-image' : 'edit-prod-images');
    if (textarea) {
      textarea.value = this.state[formType].images.map(img => img.url).join('\n');
    }
    this.renderImages(formType);
    if (typeof showToast === 'function') showToast('Photo removed.');
  },

  makePrimary(formType, index) {
    if (!this.state[formType]?.images) return;
    if (index > 0 && index < this.state[formType].images.length) {
      const item = this.state[formType].images.splice(index, 1)[0];
      this.state[formType].images.unshift(item);
      const textarea = document.getElementById(formType === 'adm' ? 'adm-prod-image' : 'edit-prod-images');
      if (textarea) {
        textarea.value = this.state[formType].images.map(img => img.url).join('\n');
      }
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

    // Split strictly by newlines - NEVER by comma (base64 data URLs contain commas)
    const urls = raw.split(/\r?\n/).map(u => u.trim()).filter(u => u.length > 0);
    urls.forEach((url, i) => {
      if (url.startsWith('data:image') && (!url.includes(';base64,') || url.length < 100)) return;
      this.state[formType].images.push({
        id: 'url-' + Date.now() + '-' + i,
        url: url,
        name: url.startsWith('data:') ? `Photo ${this.state[formType].images.length + 1}` : (url.split('/').pop().split('?')[0] || `Image ${this.state[formType].images.length + 1}`),
        sizeStr: url.startsWith('data:') ? 'Optimized' : 'Web Link',
        isUploading: false
      });
    });

    textarea.value = this.state[formType].images.map(img => img.url).join('\n');
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
    // MediaUploader state is the single source of truth when images exist in state
    let list = (this.state[formType]?.images || []).map(img => img.url).filter(u => !!u && typeof u === 'string');

    // ONLY fallback to manual textarea if state is completely empty
    if (list.length === 0) {
      const textarea = document.getElementById(formType === 'adm' ? 'adm-prod-image' : 'edit-prod-images');
      if (textarea && textarea.value.trim()) {
        const lines = textarea.value.trim().split(/\r?\n/).map(u => u.trim()).filter(u => u.length > 0);
        list.push(...lines);
      }
    }

    // Sanitize against broken base64 pieces and invalid chunks
    const valid = list.filter(u => {
      if (!u || typeof u !== 'string') return false;
      const trimmed = u.trim();
      if (trimmed.startsWith('data:image')) {
        return trimmed.length > 100 && trimmed.includes(';base64,');
      }
      return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('assets/') || trimmed.startsWith('/uploads/') || trimmed.startsWith('blob:');
    });

    // If genuine photos exist, eliminate accidental hero_showcase duplicate fallbacks
    let sanitized = valid;
    if (sanitized.length > 1) {
      const genuine = sanitized.filter(u => u !== 'assets/hero_showcase.jpg');
      if (genuine.length > 0) sanitized = genuine;
    }

    // Deduplicate
    sanitized = Array.from(new Set(sanitized));

    return sanitized.length > 0 ? sanitized : ['assets/hero_showcase.jpg'];
  },

  getVideo(formType) {
    if (this.state[formType]?.video && this.state[formType].video.url) {
      return this.state[formType].video.url;
    }
    const input = document.getElementById(formType === 'adm' ? 'adm-prod-video' : 'edit-prod-video');
    return input ? input.value.trim() : '';
  },

  // Setters for populating edit modal
  setImages(formType, urls) {
    if (!this.state[formType]) this.state[formType] = { images: [], video: null };

    // Sanitize incoming URLs: filter out broken fragments and accidental duplicates of hero_showcase
    let cleanUrls = (urls || []).filter(u => typeof u === 'string' && u.trim().length > 0);
    cleanUrls = cleanUrls.filter(u => {
      const trimmed = u.trim();
      if (trimmed.startsWith('data:image')) {
        return trimmed.length > 100 && trimmed.includes(';base64,');
      }
      return true;
    });
    if (cleanUrls.length > 1) {
      const genuine = cleanUrls.filter(u => u !== 'assets/hero_showcase.jpg');
      if (genuine.length > 0) cleanUrls = genuine;
    }
    cleanUrls = Array.from(new Set(cleanUrls));

    this.state[formType].images = cleanUrls.map((url, i) => {
      const item = {
        id: 'exist-' + Date.now() + '-' + i,
        url: url,
        name: url.startsWith('data:') ? `Product Photo ${i + 1}` : (url.split('/').pop().split('?')[0] || `Image ${i + 1}`),
        sizeStr: url.startsWith('/uploads/') ? 'Stored on Server' : (url.startsWith('data:') ? 'Optimized Asset' : 'Web Asset'),
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

    // Keep textarea in sync
    const textarea = document.getElementById(formType === 'adm' ? 'adm-prod-image' : 'edit-prod-images');
    if (textarea) {
      textarea.value = cleanUrls.join('\n');
    }
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
