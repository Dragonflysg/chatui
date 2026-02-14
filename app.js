/* =============================================
   TSI Assistant — App Logic
   ============================================= */

// Static user name
const USER_NAME = "Glenn";

// API endpoint
const API_URL = "/api/ask";

// ---- Greeting Logic ----
function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    return "Good Evening";
}

// ---- Auto-resize textarea ----
function autoResize($el) {
    $el.css("height", "auto");
    $el.css("height", Math.min($el[0].scrollHeight, 140) + "px");
}

// ---- Build a response card ----
function buildCard(data) {
    const result = data.modelResult;
    const question = result.question || "Your question";
    const response = result.response || "";
    const citations = result.citations || [];
    const cardId = "card-" + Date.now();

    // Citation tabs HTML
    let tabsHtml = "";
    let panelsHtml = "";
    citations.forEach(function (cite, idx) {
        const activeClass = idx === 0 ? " active" : "";
        tabsHtml += '<button class="citation-tab' + activeClass + '" data-idx="' + idx + '">Source ' + (idx + 1) + '</button>';

        const srcPath = (cite.metadata && cite.metadata.source) || "N/A";
        const citeId = cite.id || (cite.metadata && cite.metadata.id) || "N/A";
        const pageContent = cite.page_content || "No content available.";

        panelsHtml +=
            '<div class="citation-panel' + activeClass + '" data-idx="' + idx + '">' +
                '<div class="cite-field">' +
                    '<div class="cite-field-label">ID</div>' +
                    '<div class="cite-field-value">' + escapeHtml(citeId) + '</div>' +
                '</div>' +
                '<div class="cite-field">' +
                    '<div class="cite-field-label">Source</div>' +
                    '<div class="cite-field-value">' + escapeHtml(srcPath) + '</div>' +
                '</div>' +
                '<div class="cite-field">' +
                    '<div class="cite-field-label">Page Content</div>' +
                    '<div class="cite-field-value page-content">' + escapeHtml(pageContent) + '</div>' +
                '</div>' +
            '</div>';
    });

    const sourcesBlock = citations.length > 0
        ? '<div class="sources-section">' +
              '<div class="sources-label">Sources</div>' +
              '<div class="citation-tabs">' + tabsHtml + '</div>' +
              '<div class="citation-panels">' + panelsHtml + '</div>' +
          '</div>'
        : '';

    const renderedMarkdown = marked.parse(response);

    const cardHtml =
        '<div class="response-card expanded" id="' + cardId + '">' +
            '<div class="card-header">' +
                '<button class="card-toggle" title="Expand / Collapse"><i class="fa-solid fa-chevron-up"></i></button>' +
                '<div class="card-question">' + escapeHtml(question) + '</div>' +
                '<button class="card-close" title="Close card"><i class="fa-solid fa-xmark"></i></button>' +
            '</div>' +
            '<div class="card-body">' +
                '<div class="response-content">' + renderedMarkdown + '</div>' +
                sourcesBlock +
            '</div>' +
        '</div>';

    return cardHtml;
}

// ---- HTML escape helper ----
function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ---- Collapse all existing cards ----
function collapseAllCards() {
    $(".response-card.expanded").removeClass("expanded");
}

// ---- Submit a question ----
function submitQuestion(text) {
    text = text.trim();
    if (!text) return;

    // Hide hero on first query
    var $hero = $("#hero-section");
    if (!$hero.hasClass("hidden")) {
        $hero.addClass("hidden");
        $("#input-section").addClass("compact");
    }

    // Clear input
    $("#user-input").val("").trigger("input");

    // Show loading
    $("#loading-indicator").addClass("visible");

    // Collapse previous cards
    collapseAllCards();

    // Send POST
    $.ajax({
        url: API_URL,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ question: text }),
        dataType: "json",
        success: function (data) {
            $("#loading-indicator").removeClass("visible");

            // Override question with what user actually typed
            if (data.modelResult) {
                data.modelResult.question = text;
            }

            var cardHtml = buildCard(data);
            $("#cards-container").prepend(cardHtml);
        },
        error: function () {
            $("#loading-indicator").removeClass("visible");
            alert("Something went wrong. Please make sure the server is running.");
        }
    });
}

// ---- Document Ready ----
$(function () {

    // Set greeting
    $("#greeting-text").html(
        getGreeting() + ", " + USER_NAME + "<br>Can I help you with anything?"
    );

    // Textarea auto-resize + send button state
    var $input = $("#user-input");
    var $sendBtn = $("#send-btn");

    $input.on("input", function () {
        autoResize($input);
        if ($input.val().trim().length > 0) {
            $sendBtn.addClass("active");
        } else {
            $sendBtn.removeClass("active");
        }
    });

    // Enter to send (Shift+Enter for newline)
    $input.on("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitQuestion($input.val());
        }
    });

    // Send button click
    $sendBtn.on("click", function () {
        submitQuestion($input.val());
    });

    // Sample prompt click
    $(".prompt-card").on("click", function () {
        var prompt = $(this).data("prompt");
        submitQuestion(prompt);
    });

    // Card toggle (expand / collapse) — delegated
    $(document).on("click", ".card-header", function (e) {
        // Ignore if clicking close button
        if ($(e.target).closest(".card-close").length) return;
        $(this).closest(".response-card").toggleClass("expanded");
    });

    // Card close — delegated
    $(document).on("click", ".card-close", function (e) {
        e.stopPropagation();
        $(this).closest(".response-card").fadeOut(300, function () {
            $(this).remove();
        });
    });

    // Citation tab switching — delegated
    $(document).on("click", ".citation-tab", function () {
        var $tab = $(this);
        var idx = $tab.data("idx");
        var $sources = $tab.closest(".sources-section");

        $sources.find(".citation-tab").removeClass("active");
        $tab.addClass("active");

        $sources.find(".citation-panel").removeClass("active");
        $sources.find('.citation-panel[data-idx="' + idx + '"]').addClass("active");
    });
});
