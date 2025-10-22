class WebCrawlerDashboard {
  constructor() {
    this.jobs = new Map();
    this.expandedJobs = new Set(); // Track which jobs have expanded data
    this.init();
  }

  init() {
    this.setupFormHandlers();
    this.setupRuleManagement();
    this.loadJobs();
    this.startPolling();

    // Add first rule by default
    this.addRule();
  }

  setupFormHandlers() {
    const form = document.getElementById("job-form");
    form.addEventListener("submit", (e) => this.handleJobSubmission(e));
  }

  setupRuleManagement() {
    const addRuleBtn = document.getElementById("add-rule-btn");
    addRuleBtn.addEventListener("click", () => this.addRule());
  }

  addRule() {
    const template = document.getElementById("rule-template");
    const rulesContainer = document.getElementById("rules-container");

    const clone = template.content.cloneNode(true);
    const ruleCard = clone.querySelector(".rule-card");

    // Setup remove button
    const removeBtn = ruleCard.querySelector(".remove-rule-btn");
    removeBtn.addEventListener("click", () => {
      ruleCard.remove();
    });

    // Setup type change handler for attribute field
    const typeSelect = ruleCard.querySelector(".rule-type");
    const attributeGroup = ruleCard.querySelector(".rule-attribute-group");

    typeSelect.addEventListener("change", () => {
      attributeGroup.style.display =
        typeSelect.value === "attribute" ? "block" : "none";
    });

    // Setup selector type change handler
    const selectorTypeSelect = ruleCard.querySelector(".rule-selector-type");
    const selectorLabel = ruleCard.querySelector(".selector-label");
    const selectorInput = ruleCard.querySelector(".rule-selector");

    selectorTypeSelect.addEventListener("change", () => {
      const selectorType = selectorTypeSelect.value;
      if (selectorType === "css") {
        selectorLabel.textContent = "CSS Selector";
        selectorInput.placeholder = "e.g., h1.title";
      } else if (selectorType === "xpath") {
        selectorLabel.textContent = "XPath";
        selectorInput.placeholder = "e.g., //h1[@class='title']";
      }
    });

    rulesContainer.appendChild(ruleCard);
  }

  async handleJobSubmission(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
      submitBtn.textContent = "Submitting...";
      submitBtn.disabled = true;

      const formData = this.collectFormData();

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit job");
      }

      const job = await response.json();

      // Add to local jobs map for immediate display
      this.jobs.set(job.id, job);
      this.renderJobs();

      // Reset form
      this.resetForm();

      this.showMessage("Job submitted successfully!", "success");
    } catch (error) {
      console.error("Job submission error:", error);
      this.showMessage(error.message, "error");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  collectFormData() {
    const url = document.getElementById("url").value;
    const ruleCards = document.querySelectorAll(".rule-card");

    const extractRules = Array.from(ruleCards)
      .map((card) => {
        const name = card.querySelector(".rule-name").value;
        const selector = card.querySelector(".rule-selector").value;
        const type = card.querySelector(".rule-type").value;
        const selectorType = card.querySelector(".rule-selector-type").value;
        const multiple = card.querySelector(".rule-multiple").checked;

        if (!name || !selector) return null;

        const rule = { name, selector, type, selectorType, multiple };

        if (type === "attribute") {
          const attribute = card.querySelector(".rule-attribute").value;
          if (!attribute) return null;
          rule.attribute = attribute;
        }

        return rule;
      })
      .filter((rule) => rule !== null);

    return {
      url,
      extractRules: extractRules.length > 0 ? extractRules : undefined,
    };
  }

  resetForm() {
    document.getElementById("url").value = "";

    // Clear all rules and add one default
    const rulesContainer = document.getElementById("rules-container");
    rulesContainer.innerHTML = "";
    this.addRule();
  }

  async loadJobs() {
    try {
      // Add cache busting parameter
      const response = await fetch(`/api/jobs?t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to load jobs");

      const jobs = await response.json();

      console.log("Loaded jobs:", jobs.length, jobs); // Debug log

      // Update jobs map
      jobs.forEach((job) => {
        const existingJob = this.jobs.get(job.id);
        if (!existingJob || existingJob.status !== job.status) {
          console.log(
            `Job ${job.id} status: ${existingJob?.status} -> ${job.status}`
          ); // Debug log
        }
        this.jobs.set(job.id, job);
      });

      this.renderJobs();
    } catch (error) {
      console.error("Failed to load jobs:", error);
      this.showMessage("Failed to load jobs", "error");
    }
  }

  renderJobs() {
    const jobsList = document.getElementById("jobs-list");
    const jobCount = document.getElementById("job-count");

    if (this.jobs.size === 0) {
      jobsList.innerHTML =
        '<div class="loading">No jobs yet. Submit your first crawl job above!</div>';
      jobCount.textContent = "0 jobs";
      return;
    }

    // Convert map to array and sort by newest first
    const jobsArray = Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Update job count
    jobCount.textContent = `${jobsArray.length} job${jobsArray.length !== 1 ? "s" : ""}`;

    jobsList.innerHTML = jobsArray
      .map((job) => this.renderJobCard(job))
      .join("");

    // Add event listeners for expand buttons
    this.setupExpandButtons();
  }

  setupExpandButtons() {
    const expandButtons = document.querySelectorAll(".expand-btn");
    expandButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const jobId = parseInt(e.target.getAttribute("data-job-id"));
        const dataContent = document.getElementById(`job-data-${jobId}`);

        if (dataContent) {
          const isCurrentlyHidden = dataContent.style.display === "none";

          if (isCurrentlyHidden) {
            // Show data and track as expanded
            this.expandedJobs.add(jobId);
            dataContent.style.display = "block";
            e.target.textContent = "Hide Data";
          } else {
            // Hide data and remove from expanded set
            this.expandedJobs.delete(jobId);
            dataContent.style.display = "none";
            e.target.textContent = "Show Data";
          }
        }
      });
    });
  }

  renderJobCard(job) {
    const statusClass = job.status.toLowerCase();
    const timeAgo = this.formatTimeAgo(job.createdAt);

    return `
            <div class="job-card ${statusClass}" data-job-id="${job.id}">
                <div class="job-header">
                    <div class="job-header-left">
                        <span class="job-id">Job #${job.id}</span>
                    </div>
                    <div class="job-header-right">
                        <span class="job-status status-${statusClass}">${job.status}</span>
                    </div>
                </div>
                <div class="job-url" title="${job.url}">${job.url}</div>
                <div class="job-time">
                    ${timeAgo}
                </div>
                ${this.renderJobData(job)}
                ${job.error ? `<div class="error-message" style="font-size: 0.8rem; padding: 0.5rem; margin-top: 0.5rem;">${job.error}</div>` : ""}
            </div>
        `;
  }

  renderJobData(job) {
    if (!job.data || job.status !== "COMPLETED") return "";

    const dataStr = JSON.stringify(job.data, null, 2);
    const jobId = job.id;
    const isExpanded = this.expandedJobs.has(jobId);

    return `
            <div class="job-data">
                <div class="job-data-preview">
                    <strong style="font-size: 0.85rem;">Extracted:</strong>
                    <span style="color: var(--text-muted); font-size: 0.8rem;">
                        ${Object.keys(job.data).length} field(s)
                    </span>
                </div>
                <div class="job-data-content" id="job-data-${jobId}" style="display: ${isExpanded ? "block" : "none"};">
                    <pre>${dataStr}</pre>
                </div>
                <button class="expand-btn" data-job-id="${jobId}">
                    ${isExpanded ? "Hide Data" : "Show Data"}
                </button>
            </div>
        `;
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  showMessage(text, type) {
    // Create a temporary message element
    const message = document.createElement("div");
    message.className =
      type === "success" ? "success-message" : "error-message";
    message.textContent = text;
    message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            padding: 1rem;
            border-radius: 6px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;

    if (type === "success") {
      message.style.background = "rgba(16, 185, 129, 0.1)";
      message.style.border = "1px solid var(--success)";
      message.style.color = "var(--success)";
    }

    document.body.appendChild(message);

    // Remove after 3 seconds
    setTimeout(() => {
      message.remove();
    }, 3000);
  }

  startPolling() {
    // Poll for job updates every 2 seconds
    console.log("Starting polling for job updates every 2 seconds");
    setInterval(() => {
      console.log("Polling for job updates...");
      this.loadJobs();
    }, 2000);
  }
}

// Add CSS animation
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Initialize the dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new WebCrawlerDashboard();
});
