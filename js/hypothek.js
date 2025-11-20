document.addEventListener('DOMContentLoaded', () => {
    console.log("System bereit.");

    // 1. Buttons verknüpfen
    const calcBtn = document.getElementById('calculateBtn');
    if (calcBtn) calcBtn.addEventListener('click', startAnalysis);

    const leadBtn = document.getElementById('leadBtn');
    if (leadBtn) leadBtn.addEventListener('click', submitLead);

    // 2. Automatische 1'000er Formatierung bei Eingabe
    const moneyInputs = document.querySelectorAll('.money');
    moneyInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val) e.target.value = Number(val).toLocaleString('de-CH').replace(/,/g, "'");
        });
    });
});


// ==========================================
// 1. HILFSFUNKTIONEN
// ==========================================

function getSafeValue(id) {
    const element = document.getElementById(id);
    // Checkboxen behandeln wir separat in der Logik, hier nur Text/Values
    return element ? element.value : '';
}

function parseMoney(id) {
    const rawVal = getSafeValue(id);
    if (!rawVal) return 0;
    const cleanStr = String(rawVal).replace(/[^0-9]/g, '');
    return parseInt(cleanStr, 10) || 0;
}

function getAge(id) {
    const dateString = getSafeValue(id);
    if (!dateString) return 0;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

function fmtCHF(num) {
    return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: 'CHF',
        maximumFractionDigits: 0
    }).format(num);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}


// ==========================================
// 2. HAUPT-ANALYSE
// ==========================================

function startAnalysis(e) {
    if (e) e.preventDefault();

    // --- KONSTANTEN ---
    const LIMIT_AFFORDABILITY = 33.33; // Strenge Grenze
    const RATE_CALC = 0.05; // 5% Kalkulatorisch
    const ALV_MAX_INSURED = 148200; // Max versicherter Lohn ALV

    // --- A. DATEN EINLESEN ---

    // Personen & Status (für ALV wichtig)
    const civil1 = getSafeValue('civil_b1'); // 'ledig', 'verheiratet'
    // Checkboxen sicher abfragen
    const elKids1 = document.getElementById('has_kids_b1');
    const hasKids1 = elKids1 ? elKids1.checked : false;
    
    const civil2 = getSafeValue('civil_b2');
    const elKids2 = document.getElementById('has_kids_b2');
    const hasKids2 = elKids2 ? elKids2.checked : false;

    // Unterhaltspflicht bestimmen: Verheiratet ODER Kinder
    const isObligated1 = (civil1 === 'verheiratet' || hasKids1);
    const isObligated2 = (civil2 === 'verheiratet' || hasKids2);

    // Finanzen Käufer 1
    const inc1 = parseMoney('income_b1');
    const bonus1 = parseMoney('bonus_b1');
    const pensOld1 = parseMoney('pension_old_b1');
    const pensDis1 = parseMoney('pension_dis_b1');
    const pensSur1 = parseMoney('pension_sur_b1');
    const age1 = getAge('birthdate_b1');

    // Finanzen Käufer 2
    const inc2 = parseMoney('income_b2');
    const bonus2 = parseMoney('bonus_b2');
    const pensOld2 = parseMoney('pension_old_b2');
    const pensDis2 = parseMoney('pension_dis_b2');
    const pensSur2 = parseMoney('pension_sur_b2');
    const age2 = getAge('birthdate_b2');

    // Schulden & Objekt
    const liab1 = parseMoney('liabilities_b1');
    const liab2 = parseMoney('liabilities_b2');
    const totalLiabilitiesYear = liab1 + liab2;

    const price = parseMoney('propertyPrice');
    const renovation = parseMoney('renovationCost');
    const buildYearVal = getSafeValue('buildYear');

    // Kaufnebenkosten
    const tax = parseMoney('tax_transfer');
    const notary = parseMoney('fee_notary');
    const registry = parseMoney('fee_registry');
    const noteFee = parseMoney('fee_mortgage');

    // Eigenmittel
    const eqCash = parseMoney('equityCash');
    const eq3a = parseMoney('equity3a');
    const eqPK = parseMoney('equityPK');

    // Validierung
    if (price < 10000) {
        alert("Bitte geben Sie einen gültigen Kaufpreis ein.");
        return;
    }

    // --- B. AGGREGATION ---
    const income1_total = inc1 + bonus1;
    const income2_total = inc2 + bonus2;
    const totalIncome = income1_total + income2_total;
    const totalEquity = eqCash + eq3a + eqPK;
    // Rente schätzen falls leer
    const totalPension = (pensOld1 + pensOld2) > 0 ? (pensOld1 + pensOld2) : (totalIncome * 0.6);
    const maxAge = Math.max(age1, age2);


    // --- C. PHASE 1: ANSCHAFFUNG ---

    const totalBuyingFees = tax + notary + registry + noteFee;
    const totalObjektInvest = price + renovation; // Mehrkosten erhöhen Hypothekar-Basis
    const mortgage = Math.max(0, totalObjektInvest - totalEquity);
    const lendingRatio = (totalObjektInvest > 0) ? (mortgage / totalObjektInvest) * 100 : 0;
    const totalCashNeeded = totalEquity + totalBuyingFees;

    // Output Phase 1
    setText('d_totalIncomePhase1', fmtCHF(totalIncome));
    setText('d_mortgage', fmtCHF(mortgage));
    setText('d_lending', `Belehnung: ${lendingRatio.toFixed(1)}%`);
    setText('d_buyingFees', fmtCHF(totalBuyingFees));
    setText('d_totalInvest', fmtCHF(totalObjektInvest));
    setText('d_cashNeeded', fmtCHF(totalCashNeeded));
    if (document.getElementById('d_equityTotal')) {
        setText('d_equityTotal', fmtCHF(totalEquity));
        setText('d_equitySplit', `Cash: ${fmtCHF(eqCash)} | PK/3a: ${fmtCHF(eq3a + eqPK)}`);
    }


    // --- D. PHASE 2: LAUFENDE KOSTEN ---

    const max1st = totalObjektInvest * 0.6666;
    const mortgage2nd = Math.max(0, mortgage - max1st);

    // 1. Amortisationsdauer (Dynamisch: Bis 65)
    let yearsToRetire = 65 - maxAge;
    let amortDuration = 15;
    if (maxAge > 0) {
        if (yearsToRetire < 1) yearsToRetire = 1;
        amortDuration = Math.min(15, yearsToRetire);
    }

    // 2. HEV Satz (Baujahr)
    const currentYear = new Date().getFullYear();
    let buildingAge = 20; // Default Altbau
    if (buildYearVal) buildingAge = currentYear - parseInt(buildYearVal);
    
    let hevRate = 0.008; // Altbau > 10 Jahre
    if (buildingAge <= 10) hevRate = 0.005; // Neubau <= 10 Jahre

    // 3. Kosten Berechnung
    const interestYear = mortgage * RATE_CALC;
    const amortYear = mortgage2nd / amortDuration;
    
    // Bank-Sicht (Pauschal 1% für Tragbarkeit)
    const maintenanceBank = totalObjektInvest * 0.01;
    
    // Beratungs-Sicht (HEV)
    const maintenanceReal = totalObjektInvest * 0.003; // ca 0.3% Energie
    const maintenanceTotalHEV = totalObjektInvest * hevRate;
    const maintenanceSave = Math.max(0, maintenanceTotalHEV - maintenanceReal);

    // Tragbarkeit (Bank-Regeln)
    const housingCostsBank = interestYear + amortYear + maintenanceBank;
    const totalBurdenBank = housingCostsBank + totalLiabilitiesYear;
    const affordPct = (totalIncome > 0) ? (totalBurdenBank / totalIncome) * 100 : 0;

    // Output Phase 2
    setText('d_interestYear', fmtCHF(interestYear));
    setText('d_amortYear', fmtCHF(amortYear));
    setText('d_maintenanceSave', fmtCHF(maintenanceSave));
    setText('d_maintenanceReal', fmtCHF(maintenanceReal));

    const bar = document.getElementById('d_affordabilityBar');
    const barText = document.getElementById('d_affordabilityText');
    if (bar) {
        bar.style.width = Math.min(affordPct, 100) + "%";
        if (affordPct <= 33.33) {
            bar.style.background = "var(--good)";
            barText.textContent = `Tragbarkeit: ${affordPct.toFixed(2)}% (Gut)`;
        } else if (affordPct <= 38) {
            bar.style.background = "var(--warning)";
            barText.textContent = `Tragbarkeit: ${affordPct.toFixed(2)}% (Erhöht)`;
        } else {
            bar.style.background = "var(--danger)";
            barText.textContent = `Tragbarkeit: ${affordPct.toFixed(2)}% (Kritisch)`;
        }
    }


    // --- E. RISIKO-CHECK ---

    // Das benötigte Einkommen, um 33.33% zu erreichen
    const requiredIncome = totalBurdenBank / (LIMIT_AFFORDABILITY / 100);

    // 1. ARBEITSLOSIGKEIT (ALV)
    // ------------------------------------------------
    function calculateALV(income, isObligated) {
        // Deckelung auf 148'200 CHF
        const insured = Math.min(income, ALV_MAX_INSURED);
        // 80% wenn unterhaltspflichtig, sonst 70%
        const rate = isObligated ? 0.80 : 0.70;
        return insured * rate;
    }

    // Fall A: Person 1 arbeitslos
    const alv1 = calculateALV(income1_total, isObligated1);
    const incJob1 = alv1 + income2_total;

    // Fall B: Person 2 arbeitslos
    const alv2 = calculateALV(income2_total, isObligated2);
    const incJob2 = income1_total + alv2;

    let riskIncomeJob = Math.min(incJob1, incJob2);
    if (totalIncome === income1_total) riskIncomeJob = alv1; // Single

    const gapJob = Math.max(0, requiredIncome - riskIncomeJob);
    const affordJobPct = (riskIncomeJob > 0) ? (totalBurdenBank / riskIncomeJob) * 100 : 0;


    // 2. INVALIDITÄT (Rente / Einkommenslücke)
    // ------------------------------------------------
    // Fall A: Person 1 invalid
    const incInv1 = pensDis1 + income2_total;
    // Fall B: Person 2 invalid
    const incInv2 = income1_total + pensDis2;
    
    let riskIncomeInv = Math.min(incInv1, incInv2);
    if (totalIncome === income1_total) riskIncomeInv = pensDis1;

    const gapInv = Math.max(0, requiredIncome - riskIncomeInv);
    const affordInvPct = (riskIncomeInv > 0) ? (totalBurdenBank / riskIncomeInv) * 100 : 0;


    // 3. TODESFALL (Kapitalbedarf)
    // ------------------------------------------------
    // Fall A: Person 1 stirbt
    const incDeath1 = income2_total + pensSur1;
    // Fall B: Person 2 stirbt
    const incDeath2 = income1_total + pensSur2;
    
    let riskIncomeDeath = Math.min(incDeath1, incDeath2);
    if (totalIncome === income1_total) riskIncomeDeath = pensSur1;

    const affordDeathPct = (riskIncomeDeath > 0) ? (totalBurdenBank / riskIncomeDeath) * 100 : 0;

    // Kapitalberechnung: Wie viel Hypothek muss weg?
    // Wie viel darf die Belastung max sein mit dem Witweneinkommen?
    const maxBurdenDeath = riskIncomeDeath * (LIMIT_AFFORDABILITY / 100);
    const annualShortfallDeath = Math.max(0, totalBurdenBank - maxBurdenDeath);
    
    // Hebel: 5% Zins + Amortisationssatz
    const amortRate = (mortgage > 0) ? (amortYear / mortgage) : 0;
    const serviceRate = RATE_CALC + amortRate;
    
    let capitalGapDeath = 0;
    if (annualShortfallDeath > 0 && serviceRate > 0) {
        capitalGapDeath = annualShortfallDeath / serviceRate;
    }


    // OUTPUT RISIKO
    
    // ALV
    setText('d_gapJob', fmtCHF(gapJob));
    setText('d_affordJob', affordJobPct.toFixed(1) + "%");
    updateRiskBadge('d_statusJob', 'box_riskJob', gapJob, "Einkommens-Lücke!", "Abgedeckt (ALV)");

    // Invalidität
    setText('d_gapInvalidity', fmtCHF(gapInv));
    setText('d_affordInvalidity', affordInvPct.toFixed(1) + "%");
    updateRiskBadge('d_statusInvalidity', 'box_riskInv', gapInv, "Renten-Lücke!", "Abgedeckt");

    // Tod (Kapital)
    setText('d_gapDeath', fmtCHF(capitalGapDeath));
    setText('d_affordDeath', affordDeathPct.toFixed(1) + "%");
    
    // Badge Tod
    const badgeDeath = document.getElementById('d_statusDeath');
    const boxDeath = document.getElementById('box_riskDeath');
    if (badgeDeath) {
        if (capitalGapDeath > 0) {
            badgeDeath.textContent = "Kapitalbedarf!";
            badgeDeath.className = "badge badge-red";
            if(boxDeath) boxDeath.style.borderLeft = "4px solid var(--danger)";
        } else {
            badgeDeath.textContent = "Abgedeckt";
            badgeDeath.className = "badge badge-green";
            if(boxDeath) boxDeath.style.borderLeft = "4px solid var(--good)";
        }
    }


    // --- F. PHASE 3: ZUKUNFT (GAP) ---

    const restDebt = Math.min(mortgage, max1st);

    // Max Hypothek Rente (33.33% Tragbarkeit)
    const maxAffordableCostPension = totalPension * (LIMIT_AFFORDABILITY / 100);
    const availableForInterest = maxAffordableCostPension - maintenanceBank - totalLiabilitiesYear;
    const maxMortgagePension = Math.max(0, availableForInterest / RATE_CALC);

    // Lücke (Total)
    const fundingGap = Math.max(0, restDebt - maxMortgagePension);
    
    // Tragbarkeit Rente
    const interestPension = restDebt * RATE_CALC;
    const burdenPension = interestPension + maintenanceBank + totalLiabilitiesYear;
    const affordPensionPct = (totalPension > 0) ? (burdenPension / totalPension) * 100 : 0;

    // Output Phase 3
    setText('d_restDebt', fmtCHF(restDebt));
    setText('d_maxMortgagePension', fmtCHF(maxMortgagePension));
    setText('d_gapTotal', fmtCHF(fundingGap));
    setText('d_pensionAffordability', affordPensionPct.toFixed(1) + "%");

    const gapBadge = document.getElementById('d_gapBadge');
    const boxGap = document.getElementById('box_gapTotal');
    if (gapBadge) {
        if (fundingGap > 0) {
            gapBadge.textContent = "Unterdeckung!";
            gapBadge.className = "badge badge-red";
            if(boxGap) boxGap.style.borderColor = "var(--danger)";
        } else {
            gapBadge.textContent = "Gesichert";
            gapBadge.className = "badge badge-green";
            if(boxGap) boxGap.style.borderColor = "var(--good)";
        }
    }
    
    const penBadge = document.getElementById('d_pensionStatus');
    if (penBadge) {
        if (affordPensionPct <= 33.33) {
            penBadge.textContent = "Grün";
            penBadge.className = "badge badge-green";
        } else {
            penBadge.textContent = "Kritisch";
            penBadge.className = "badge badge-red";
        }
    }


    // --- VIEW WECHSELN ---
    const inputDiv = document.getElementById('inputStage');
    const dashDiv = document.getElementById('dashboardStage');
    if (inputDiv && dashDiv) {
        inputDiv.style.display = 'none';
        dashDiv.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Kleiner Helfer für Badges
function updateRiskBadge(badgeId, boxId, value, textBad, textGood) {
    const badge = document.getElementById(badgeId);
    const box = document.getElementById(boxId);
    if (badge) {
        if (value > 0) {
            badge.textContent = textBad;
            badge.className = "badge badge-red";
            if(box) box.style.borderLeft = "4px solid var(--danger)";
        } else {
            badge.textContent = textGood;
            badge.className = "badge badge-green";
            if(box) box.style.borderLeft = "4px solid var(--good)";
        }
    }
}

function submitLead(e) {
    if (e) e.preventDefault();
    alert("Vielen Dank! Die Daten wurden übermittelt.");
}
