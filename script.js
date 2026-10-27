const page = document.body.dataset.page;
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);

/* Demo state is shared between pages through localStorage */
const defaultState = { status: "draft", note: "", attempts: 1 };
const getState = () => Object.assign({}, defaultState, JSON.parse(localStorage.getItem("eoa") || "{}"));
const setState = s => localStorage.setItem("eoa", JSON.stringify(Object.assign(getState(), s)));

const defaultRules = {
  handbook: "AICTE APH 2024–27",
  maxStudentFacultyRatio: "1:20",
  minLandAcres: 5.0,
  minFdrAmountINR: 500000,
  maxUploadAttempts: 3,
  minOcrConfidencePct: 75
};
const getRules = () => Object.assign({}, defaultRules, JSON.parse(localStorage.getItem("valdoc_rules") || "{}"));
const setRules = r => localStorage.setItem("valdoc_rules", JSON.stringify(r));

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

function stepper(n) {
  $$(".stepper li").forEach((li, i) => {
    li.className = i < n ? "done" : i === n ? "current" : "";
  });
}

/* ---------- Login ---------- */
if (page === "login") {
  let role = "college";
  $$(".seg button").forEach(b => {
    b.onclick = () => {
      role = b.dataset.role;
      $$(".seg button").forEach(x => x.classList.toggle("active", x === b));
      const emailInput = $("#loginEmail");
      if (emailInput) {
        emailInput.value = role === "admin"
          ? "sysadmin@aicte-india.org"
          : role === "officer"
            ? "r.menon@aicte-india.org"
            : "principal@sampletech.edu.in";
      }
    };
  });

  $("#loginForm").onsubmit = e => {
    e.preventDefault();
    toast("Signed in as " + role.toUpperCase());
    const next = role === "admin"
      ? "admin.html"
      : role === "officer"
        ? "officer_dashboard.html"
        : getState().status === "draft" ? "upload.html" : "waiting.html";
    setTimeout(() => location.href = next, 600);
  };
}

/* ---------- Sign up ---------- */
if (page === "signup") {
  $("#signupForm").onsubmit = e => {
    e.preventDefault();
    toast("Account created. Taking you to sign in.");
    setTimeout(() => location.href = "login.html", 900);
  };
}

/* ---------- Upload and simulated AI scan ---------- */
if (page === "upload") {
  const rules = getRules();
  const st = getState();
  if ($("#attemptBanner")) {
    $("#attemptBanner").textContent = `Submission Attempts: ${st.attempts || 1} of ${rules.maxUploadAttempts} (Max ${rules.maxUploadAttempts} allowed)`;
  }

  $$(".dropzone").forEach(z => {
    z.querySelector("input").onchange = e => {
      if (e.target.files.length) {
        z.classList.add("filled");
        z.querySelector("small").textContent = "Uploaded: " + e.target.files[0].name;
      }
    };
  });

  if ($("#fillSampleBtn")) {
    $("#fillSampleBtn").onclick = () => {
      $$(".dropzone").forEach(z => {
        z.classList.add("filled");
        z.querySelector("small").textContent = "Uploaded: " + (z.dataset.sample || "Sample_EoA_Doc.pdf");
      });
      toast("Sample EoA documents loaded.");
    };
  }

  $("#submitBtn").onclick = () => {
    const steps = $$("#steps li");
    $("#submitBtn").disabled = true;
    $("#scan").hidden = false;
    stepper(1);
    steps.forEach((s, i) => setTimeout(() => {
      if (i) steps[i - 1].className = "done";
      s.className = "active";
      $("#bar").style.width = (i + 1) * 25 + "%";
    }, i * 600));
    setTimeout(() => {
      steps[3].className = "done";
      setState({ status: "pending", note: "" });
      toast("Pre-check complete. Application sent to AICTE.");
      setTimeout(() => location.href = "waiting.html", 800);
    }, 4 * 600);
  };
}

/* ---------- Waiting for approval ---------- */
if (page === "waiting") {
  const s = getState();
  const rules = getRules();
  const view = {
    draft: ["No application submitted", "Upload your documents to start the pre-check.", "Not submitted", "b-info", "pending"],
    pending: ["Waiting for officer approval", "Your documents have passed through the AI pre-check and are in the AICTE review queue. You will be notified when a decision is recorded.", "Pending officer review", "b-info", "pending"],
    approved: ["Approval Granted & Recorded in Audit-Log", "The AICTE officer has approved your application.", "Approved", "b-ok", "ok"],
    clarify: ["Clarification requested", "The officer needs more information or a clearer scan before deciding. Read the note below and resubmit the relevant documents.", "Clarification requested", "b-warn", "warn"],
    rejected: ["Application rejected", "The officer has recorded deficiencies. The note below explains what needs to change.", "Rejected", "b-bad", "bad"]
  }[s.status] || ["Waiting for officer approval", "Your documents are in the review queue.", "Pending officer review", "b-info", "pending"];

  $("#statusTitle").textContent = view[0];
  $("#statusText").textContent = view[1];
  $("#statusBadge").textContent = view[2];
  $("#statusBadge").className = "badge " + view[3];
  $("#statusPanel").dataset.state = view[4];
  if (s.note) {
    $("#officerNote").hidden = false;
    $("#officerNote").textContent = "Officer note: " + s.note;
  }
  if ($("#waitAttemptText")) {
    const rem = Math.max(0, rules.maxUploadAttempts - (s.attempts || 1));
    $("#waitAttemptText").textContent = `Re-upload Attempts Remaining: ${rem} of ${rules.maxUploadAttempts}`;
  }
  stepper(s.status === "draft" ? 0 : s.status === "pending" ? 2 : 4);
  $("#resetDemo").onclick = () => localStorage.removeItem("eoa");
}

/* ---------- Officer dashboard ---------- */
if (page === "officer") {
  const labels = {
    approved: ["Approved", "b-ok"],
    clarify: ["Clarification requested", "b-warn"],
    rejected: ["Rejected", "b-bad"]
  };
  const showStatus = () => {
    const l = labels[getState().status] || ["Pending officer review", "b-info"];
    $("#myStatus").textContent = l[0];
    $("#myStatus").className = "badge " + l[1];
  };
  showStatus();

  const rules = getRules();
  if ($("#activeRuleText")) {
    $("#activeRuleText").textContent = `${rules.handbook} · SFR ≤ ${rules.maxStudentFacultyRatio} · Min Land ≥ ${rules.minLandAcres} Acres · Min FDR ≥ Rs ${Number(rules.minFdrAmountINR).toLocaleString("en-IN")}`;
  }

  $$("[data-decision]").forEach(b => {
    b.onclick = () => {
      const dec = b.dataset.decision;
      const curAttempts = getState().attempts || 1;
      setState({
        status: dec,
        note: $("#noteBox").value.trim(),
        attempts: dec === "clarify" ? Math.min(rules.maxUploadAttempts, curAttempts + 1) : curAttempts
      });
      showStatus();
      toast("Decision recorded: " + labels[dec][0]);
    };
  });

  $$("[data-ev]").forEach(b => {
    b.onclick = () => {
      if ($("#modalTitle")) $("#modalTitle").textContent = b.dataset.docTitle || "Evidence";
      if ($("#modalDeclared")) $("#modalDeclared").textContent = b.dataset.docDeclared || "—";
      if ($("#modalExtracted")) $("#modalExtracted").textContent = b.dataset.docExtracted || "—";
      if ($("#modalExcerpt")) $("#modalExcerpt").textContent = b.dataset.docExcerpt || "";
      $("#modalText").textContent = b.dataset.ev;
      $("#modal").hidden = false;
    };
  });

  const appHeaders = {
    "04817": "Review: Sample Institute of Technology (EOA-2026-04817)",
    "04102": "Review: Greenfield Institute of Engineering (EOA-2026-04102 — Manual Review Required)",
    "03988": "Review: Riverdale College of Technology (EOA-2026-03988 — Low Risk)",
    "03655": "Review: Lakshmi Polytechnic College (EOA-2026-03655 — Clarification Requested)"
  };
  $$("[data-select-app]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.selectApp;
      $$("[data-row]").forEach(r => r.classList.toggle("hl", r.dataset.row === id));
      if ($("#reviewTitle") && appHeaders[id]) {
        $("#reviewTitle").textContent = appHeaders[id];
        toast("Switched inspection to EOA-2026-" + id);
      }
    };
  });

  $("#modalClose").onclick = () => $("#modal").hidden = true;
  $("#modal").onclick = e => { if (e.target.id === "modal") $("#modal").hidden = true; };

  $("#dlBtn").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([
      "VALDOC — AICTE EoA AI Pre-Check Summary (SIH26261)\n" +
      "Institute: Sample Institute of Technology (EOA-2026-04817)\n" +
      "Officer Decision Status: " + $("#myStatus").textContent + "\n" +
      "Officer Note: " + ($("#noteBox").value.trim() || getState().note || "None") + "\n" +
      "Rule Standard: " + rules.handbook + "\n" +
      "Disclaimer: AI output is advisory; the AICTE officer makes the final decision."
    ], { type: "text/plain" }));
    a.download = "EoA_Compliance_Summary.txt";
    a.click();
  };
}

/* ---------- Admin Console (admin.html) ---------- */
if (page === "admin") {
  const labels = {
    approved: ["Approved", "b-ok"],
    clarify: ["Clarification requested", "b-warn"],
    rejected: ["Rejected", "b-bad"]
  };

  const renderAdminLiveRow = () => {
    const st = getState();
    const rules = getRules();
    const l = labels[st.status] || ["Pending officer review", "b-info"];
    if ($("#admLiveStatus")) {
      $("#admLiveStatus").textContent = l[0];
      $("#admLiveStatus").className = "badge " + l[1];
    }
    if ($("#admLiveAttempts")) {
      $("#admLiveAttempts").textContent = `${st.attempts || 1} / ${rules.maxUploadAttempts}`;
    }
    if ($("#admMaxAttempts")) {
      $("#admMaxAttempts").textContent = rules.maxUploadAttempts;
    }
  };

  const loadRuleForm = () => {
    const r = getRules();
    $("#cfgHandbook").value = r.handbook;
    $("#cfgRatio").value = r.maxStudentFacultyRatio;
    $("#cfgLand").value = r.minLandAcres;
    $("#cfgFdr").value = r.minFdrAmountINR;
    $("#cfgAttempts").value = r.maxUploadAttempts;
    $("#cfgOcrConf").value = r.minOcrConfidencePct;
    $("#jsonPreview").textContent = JSON.stringify(r, null, 2);
  };

  loadRuleForm();
  renderAdminLiveRow();

  $("#adminRuleForm").onsubmit = e => {
    e.preventDefault();
    const updated = {
      handbook: $("#cfgHandbook").value.trim() || "AICTE APH 2024–27",
      maxStudentFacultyRatio: $("#cfgRatio").value.trim() || "1:20",
      minLandAcres: parseFloat($("#cfgLand").value) || 5.0,
      minFdrAmountINR: parseInt($("#cfgFdr").value, 10) || 500000,
      maxUploadAttempts: parseInt($("#cfgAttempts").value, 10) || 3,
      minOcrConfidencePct: parseInt($("#cfgOcrConf").value, 10) || 75
    };
    setRules(updated);
    $("#jsonPreview").textContent = JSON.stringify(updated, null, 2);
    renderAdminLiveRow();
    toast("AICTE Rule Table (JSON) saved and applied across portal.");
  };

  $("#resetRulesBtn").onclick = () => {
    setRules(defaultRules);
    loadRuleForm();
    renderAdminLiveRow();
    toast("Reset to default AICTE APH 2024–27 rules.");
  };

  $("#exportJsonBtn").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(getRules(), null, 2)], { type: "application/json" }));
    a.download = "rule_table.json";
    a.click();
  };

  $("#clearDemoStateBtn").onclick = () => {
    localStorage.removeItem("eoa");
    renderAdminLiveRow();
    toast("Live demo application state reset.");
  };
}