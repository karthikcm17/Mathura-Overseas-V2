// Mathura Overseas — Find Your University: Eligibility Checker
//
// NEET cutoffs for MBBS-abroad eligibility, by the year NEET was passed.
// IMPORTANT: a NEET score stays valid for MBBS-abroad admission for the
// exam year plus the following two years (this differs from admission
// within India, where NEET validity is single-year only). So each year
// below should stay in this table for 3 years before it can be removed.
//
// TO ADD A FUTURE YEAR: add one line here, e.g.
//   2027: { general: 000, other: 000 },
// and add a matching <option value="2027">2027</option> in the HTML select.
// Nothing else in this file needs to change.
var NEET_CUTOFFS = {
  2026: { general: 213, other: 177 },
  2025: { general: 144, other: 113 },
  2024: { general: 162, other: 127 }
};

// PCB percentage required in Class 12, by community.
var PCB_REQUIREMENT = { general: 50, other: 40 };

// Minimum age, by 31 December of the admission year.
var MIN_AGE = 17;

document.addEventListener('DOMContentLoaded', function () {

  // ---- Tab switching ----
  var tabs = document.querySelectorAll('.fyu-tab');
  var panels = document.querySelectorAll('.fyu-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('fyu-tab--active'); });
      panels.forEach(function (p) { p.hidden = true; });
      tab.classList.add('fyu-tab--active');
      var target = document.getElementById('fyu-panel-' + tab.dataset.fyuTab);
      if (target) target.hidden = false;
    });
  });

  var form = document.getElementById('eligibilityForm');
  if (!form) return;

  var resultPanel = document.getElementById('eligibilityResult');
  var resultVerdict = document.getElementById('eligibilityVerdict');
  var resultChecklist = document.getElementById('eligibilityChecklist');
  var placeholder = document.getElementById('eligibilityPlaceholder');

  function checkRow(pass, label, detail) {
    var icon = pass
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 6"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    return '<li class="elig-check__row ' + (pass ? 'elig-check__row--pass' : 'elig-check__row--fail') + '">' +
      '<span class="elig-check__icon">' + icon + '</span>' +
      '<span><span class="elig-check__label">' + label + '</span>' +
      '<span class="elig-check__detail">' + detail + '</span></span></li>';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var neetScore = parseFloat(document.getElementById('inNeetScore').value);
    var passedYear = document.getElementById('inPassedYear').value;
    var community = document.getElementById('inCommunity').value; // 'general' or 'other'
    var pcbPercent = parseFloat(document.getElementById('inPcbPercent').value);
    var age = parseFloat(document.getElementById('inAge').value);

    if (isNaN(neetScore) || isNaN(pcbPercent) || isNaN(age)) {
      resultVerdict.className = 'elig-verdict elig-verdict--warn';
      resultVerdict.textContent = 'Please fill in every field to check your eligibility.';
      resultChecklist.innerHTML = '';
      placeholder.hidden = true;
      resultPanel.hidden = false;
      return;
    }

    var cutoffRow = NEET_CUTOFFS[passedYear];
    var neetCutoff = cutoffRow[community];
    var pcbRequired = PCB_REQUIREMENT[community];
    var communityLabel = community === 'general' ? 'General' : 'OBC / SC / ST';

    var scoreOk = neetScore >= neetCutoff;
    var pcbOk = pcbPercent >= pcbRequired;
    var ageOk = age >= MIN_AGE;
    var allOk = scoreOk && pcbOk && ageOk;

    resultChecklist.innerHTML =
      checkRow(scoreOk, 'NEET score', neetScore + ' \u2014 minimum ' + neetCutoff + ' required (' + passedYear + ', ' + communityLabel + ')') +
      checkRow(pcbOk, 'Class 12 PCB percentage', pcbPercent + '% \u2014 minimum ' + pcbRequired + '% required (' + communityLabel + ')') +
      checkRow(ageOk, 'Age by 31 Dec of admission year', age + ' \u2014 minimum ' + MIN_AGE + ' required');

    resultVerdict.className = 'elig-verdict ' + (allOk ? 'elig-verdict--pass' : 'elig-verdict--fail');
    resultVerdict.textContent = allOk
      ? 'You meet the baseline eligibility criteria for MBBS abroad.'
      : 'You don\u2019t meet all criteria yet \u2014 see below. A counsellor can confirm if any exceptions apply.';

    placeholder.hidden = true;
      resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});