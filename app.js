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
              '<div class="sources-header">' +
                  '<div class="sources-label">Sources</div>' +
                  '<button class="sources-toggle" title="Show sources"><i class="fa-solid fa-chevron-down"></i></button>' +
              '</div>' +
              '<div class="sources-body">' +
                  '<div class="citation-tabs">' + tabsHtml + '</div>' +
                  '<div class="citation-panels">' + panelsHtml + '</div>' +
              '</div>' +
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

// ---- Timer state ----
var timerInterval = null;
var timerStart = 0;

function startTimer() {
    timerStart = performance.now();
    $("#elapsed-timer").text("0.0s");
    timerInterval = setInterval(function () {
        var elapsed = ((performance.now() - timerStart) / 1000).toFixed(1);
        $("#elapsed-timer").text(elapsed + "s");
    }, 100);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    return ((performance.now() - timerStart) / 1000).toFixed(1);
}

// ---- Lock / unlock input ----
function lockInput() {
    $("#user-input").prop("disabled", true);
    $("#send-btn").prop("disabled", true).addClass("disabled");
}

function unlockInput() {
    var $input = $("#user-input");
    $input.val("").trigger("input");
    $input.prop("disabled", false);
    $("#send-btn").prop("disabled", false).removeClass("disabled");
    $input.focus();
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

    // Disable input (keep the question visible)
    lockInput();

    // Hide any previous elapsed result
    $("#elapsed-result").removeClass("visible").text("");

    // Show loading + start timer
    $("#loading-indicator").addClass("visible");
    startTimer();

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
            var elapsed = stopTimer();

            // Hide loading indicator
            $("#loading-indicator").removeClass("visible");

            // Show elapsed result
            $("#elapsed-result").html(
                '<i class="fa-regular fa-clock"></i> Response took <strong>' + elapsed + 's</strong>'
            ).addClass("visible");

            // Unlock and clear input
            unlockInput();

            // Override question with what user actually typed
            if (data.modelResult) {
                data.modelResult.question = text;
            }

            var cardHtml = buildCard(data);
            $("#cards-container").prepend(cardHtml);
        },
        error: function () {
            stopTimer();
            $("#loading-indicator").removeClass("visible");
            unlockInput();
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

    // Sources toggle (expand / collapse) — delegated
    $(document).on("click", ".sources-header", function () {
        $(this).closest(".sources-section").toggleClass("expanded");
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
