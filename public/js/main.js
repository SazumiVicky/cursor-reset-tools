document.addEventListener('DOMContentLoaded', () => {
  const si = document.getElementById('system-info');
  const cs = document.getElementById('cursor-status');
  const rb = document.getElementById('reset-btn');
  const bp = document.getElementById('bypass-btn');
  const du = document.getElementById('disable-update-btn');
  const pc = document.getElementById('pro-convert-btn');
  const rr = document.getElementById('reset-result');
  const dm = document.getElementById('disclaimer-modal');
  const ad = document.getElementById('accept-disclaimer');
  const mc = document.querySelector('.modal-close');
  
  const cm = () => {
    dm.style.display = 'none';
    localStorage.setItem('disclaimerAccepted', 'true');
    document.body.style.overflow = 'auto';
  };
  
  const sd = () => {
    if (!localStorage.getItem('disclaimerAccepted')) {
      dm.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  };
  
  if (ad) ad.addEventListener('click', cm);
  if (mc) mc.addEventListener('click', cm);
  
  window.addEventListener('click', (e) => {
    if (e.target === dm) cm();
  });
  
  const gp = async () => {
    const r = await fetch('/api/paths');
    return await r.json();
  };
  
  const ub = (isRunning) => {
    rb.disabled = isRunning;
    bp.disabled = isRunning;
    du.disabled = isRunning;
    pc.disabled = isRunning;
    
    if (isRunning) {
      rb.title = "Close Cursor first";
      bp.title = "Close Cursor first";
      du.title = "Close Cursor first";
      pc.title = "Close Cursor first";
    } else {
      rb.title = "";
      bp.title = "";
      du.title = "";
      pc.title = "";
    }
  };
  
  const cc = async () => {
    try {
      const p = await gp();
      if (p.isRunning !== undefined) {
        ub(p.isRunning);
        
        const statusBadge = document.getElementById('cursor-status-badge');
        if (statusBadge) {
          statusBadge.className = p.isRunning ? 'badge badge-danger' : 'badge badge-success';
          statusBadge.textContent = p.isRunning ? 'Running' : 'Not Running';
        }
        
        const warningMsg = document.getElementById('cursor-warning');
        if (warningMsg) {
          warningMsg.style.display = p.isRunning ? 'block' : 'none';
        }
      }
    } catch (e) {
      console.error('Error checking Cursor status:', e);
    }
  };
  
  const gs = async () => {
    try {
      si.innerHTML = '<div class="loading">Loading system information...</div>';
      cs.innerHTML = '<div class="loading">Checking Cursor status...</div>';
      
      const p = await gp();
      
      let systemHtml = '<table class="info-table">';
      systemHtml += `<tr><th>Platform</th><td>${p.platform || navigator.platform}</td></tr>`;
      systemHtml += `<tr><th>OS</th><td>${p.osVersion || navigator.userAgent}</td></tr>`;
      systemHtml += `<tr><th>Architecture</th><td>${p.arch || 'Unknown'}</td></tr>`;
      systemHtml += `<tr><th>Home Directory</th><td>${p.homedir || 'Unknown'}</td></tr>`;
      systemHtml += '</table>';
      
      si.innerHTML = systemHtml;
      
      let cursorHtml = '<table class="info-table">';
      cursorHtml += `<tr><th>Cursor Status</th><td><span id="cursor-status-badge" class="${p.isRunning ? 'badge badge-danger' : 'badge badge-success'}">${p.isRunning ? 'Running' : 'Not Running'}</span></td></tr>`;
      cursorHtml += `<tr><th>Machine ID Path</th><td>${p.machinePath || 'Not found'}</td></tr>`;
      cursorHtml += `<tr><th>Storage Path</th><td>${p.storagePath || 'Not found'}</td></tr>`;
      cursorHtml += `<tr><th>Database Path</th><td>${p.dbPath || 'Not found'}</td></tr>`;
      cursorHtml += `<tr><th>App Path</th><td>${p.appPath || 'Not found'}</td></tr>`;
      cursorHtml += `<tr><th>Update Path</th><td>${p.updatePath || 'Not found'}</td></tr>`;
      
      if (p.exists) {
        const existsHtml = Object.entries(p.exists).map(([k, v]) => 
          `<tr><th>${k} Exists</th><td>${v ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-danger">No</span>'}</td></tr>`
        ).join('');
        cursorHtml += existsHtml;
      }
      
      cursorHtml += '</table>';
      
      cursorHtml += `
        <div id="cursor-warning" class="alert alert-warning mt-3" ${!p.isRunning ? 'style="display:none"' : ''}>
          <i class="ri-alert-line"></i>
          <strong>Warning:</strong> Cursor is currently running. Please close it before using any features.
        </div>
        
        <div class="alert alert-info mt-3">
          <i class="ri-information-line"></i>
          <strong>Note:</strong> Make sure Cursor is closed before using any features.
        </div>
      `;
      
      cs.innerHTML = cursorHtml;
      
      ub(p.isRunning);
      
      setTimeout(cb, 100);
      
      setInterval(cc, 5000);
    } catch (error) {
      si.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
      cs.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
    }
  };
  
  const cb = () => {
    const codeBlocks = document.querySelectorAll('.code-block');
    codeBlocks.forEach(block => {
      block.style.height = 'auto';
      if (block.scrollHeight > block.clientHeight) {
        block.style.minHeight = Math.min(block.scrollHeight, 200) + 'px';
      }
    });
  };
  
  const rm = async () => {
    try {
      const p = await gp();
      if (p.isRunning) {
        showToast("Please close Cursor before resetting machine ID", "warning");
        return;
      }
      
      rb.disabled = true;
      rr.innerHTML = `
        <div class="processing">
          <p><i class="ri-loader-2-line ri-spin"></i>Resetting machine ID... Please wait</p>
        </div>
      `;
      
      const response = await fetch('/api/reset', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Machine ID has been reset.</p>
            ${result.log ? `<pre class="log-output">${result.log}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to reset machine ID</strong></p>
            <p>Error: ${result.error || 'Unknown error'}</p>
          </div>
        `;
      }
      
      await gs();
      setTimeout(cb, 100);
    } catch (error) {
      rr.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
    } finally {
      rb.disabled = false;
    }
  };
  
  const bk = async () => {
    try {
      const p = await gp();
      if (p.isRunning) {
        showToast("Please close Cursor before bypassing token limit", "warning");
        return;
      }
      
      bp.disabled = true;
      rr.innerHTML = `
        <div class="processing">
          <p><i class="ri-loader-2-line ri-spin"></i>Bypassing token limit... Please wait</p>
        </div>
      `;
      
      const response = await fetch('/api/patch?action=bypass', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Token limit has been bypassed.</p>
            ${result.log ? `<pre class="log-output">${result.log}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to bypass token limit</strong></p>
            <p>Error: ${result.error || 'Unknown error'}</p>
          </div>
        `;
      }
      
      await gs();
      setTimeout(cb, 100);
    } catch (error) {
      rr.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
    } finally {
      bp.disabled = false;
    }
  };
  
  const dz = async () => {
    try {
      const p = await gp();
      if (p.isRunning) {
        showToast("Please close Cursor before disabling auto-update", "warning");
        return;
      }
      
      du.disabled = true;
      rr.innerHTML = `
        <div class="processing">
          <p><i class="ri-loader-2-line ri-spin"></i>Disabling auto-update... Please wait</p>
        </div>
      `;
      
      const response = await fetch('/api/patch?action=disable', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Auto-update has been disabled.</p>
            ${result.log ? `<pre class="log-output">${result.log}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to disable auto-update</strong></p>
            <p>Error: ${result.error || 'Unknown error'}</p>
          </div>
        `;
      }
      
      await gs();
      setTimeout(cb, 100);
    } catch (error) {
      rr.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
    } finally {
      du.disabled = false;
    }
  };
  
  const pt = async () => {
    try {
      const p = await gp();
      if (p.isRunning) {
        showToast("Please close Cursor before enabling Pro features", "warning");
        return;
      }
      
      pc.disabled = true;
      rr.innerHTML = `
        <div class="processing">
          <p><i class="ri-loader-2-line ri-spin"></i>Converting to Pro + Custom UI... Please wait</p>
        </div>
      `;
      
      const response = await fetch('/api/patch?action=pro', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        rr.innerHTML = `
          <div class="success">
            <p><i class="ri-check-line"></i><strong>Success!</strong> Pro features and custom UI have been enabled.</p>
            ${result.log ? `<pre class="log-output">${result.log}</pre>` : ''}
          </div>
        `;
      } else {
        rr.innerHTML = `
          <div class="error">
            <p><i class="ri-error-warning-line"></i><strong>Failed to enable Pro features</strong></p>
            <p>Error: ${result.error || 'Unknown error'}</p>
          </div>
        `;
      }
      
      await gs();
      setTimeout(cb, 100);
    } catch (error) {
      rr.innerHTML = `<div class="error"><i class="ri-error-warning-line"></i>Error: ${error.message}</div>`;
    } finally {
      pc.disabled = false;
    }
  };
  
  const ta = () => {
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    accordionItems.forEach(item => {
      const header = item.querySelector('.accordion-header');
      
      header.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        accordionItems.forEach(accItem => {
          accItem.classList.remove('active');
        });
        
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });
  };
  
  const tl = () => {
    const items = document.querySelectorAll('.timeline-item');
    items.forEach(item => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    });
  };
  
  const td = () => {
    const vh = document.querySelectorAll('.version-header');
    vh.forEach(header => {
      header.style.display = 'flex';
      if (window.innerWidth <= 768) {
        header.style.flexDirection = 'column';
      } else {
        header.style.flexDirection = 'row';
      }
    });
  };
  
  const pl = () => {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Loading';
    si.innerHTML = loadingDiv.outerHTML;
    cs.innerHTML = loadingDiv.outerHTML;
  };
  
  const ib = () => {
    const donateBtn = document.querySelector('.donate-btn');
    if (donateBtn) {
      donateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://sociabuzz.com/sazumi/tribe', '_blank');
      });
    }
  };
  
  pl();
  gs();
  rb.addEventListener('click', rm);
  bp.addEventListener('click', bk);
  du.addEventListener('click', dz);
  pc.addEventListener('click', pt);
  
  setTimeout(() => {
    ta();
    ib();
    cb();
    sd();
    tl();
    td();
  }, 500);
});

function copyToClipboard(e) {
  const targetId = e.currentTarget.dataset.target;
  const textToCopy = document.getElementById(targetId).textContent;
  const textArea = document.createElement('textarea');
  
  textArea.value = textToCopy;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
  
  const originalHtml = e.currentTarget.innerHTML;
  e.currentTarget.innerHTML = '<i class="ri-check-line"></i>';
  document.getElementById(targetId).classList.add('copied');
  
  setTimeout(() => {
    e.currentTarget.innerHTML = originalHtml;
    document.getElementById(targetId).classList.remove('copied');
  }, 1500);
}

function showToast(message, type = 'info') {
  const toastContainer = document.querySelector('.toast-container') || (() => {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  })();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  toast.innerHTML = `
    <div class="toast-content">
      <i class="ri-${type === 'success' ? 'check-line' : type === 'error' ? 'error-warning-line' : type === 'warning' ? 'alert-line' : 'information-line'}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close"><i class="ri-close-line"></i></button>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-closing');
    setTimeout(() => {
      toast.remove();
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  }, 5000);
  
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('toast-closing');
    setTimeout(() => {
      toast.remove();
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  });
} 
