document.addEventListener("DOMContentLoaded", () => {
    class BillSplitter {
        constructor() {
            this.STORAGE_KEY = "billSplitter.v1";

            this.state = {
                billAmount: 0,
                remainingAmount: 0,
                people: ["Apurv", "Dhaivat", "Nishant", "Rutvik"],
                payments: {},        // per-person allocated so far from recorded payments
                transactions: [],    // [{ amount: "€12.34", people: "A, B" }, ...]
                createdAt: null
            };

            this.elements = {
                billInput: document.getElementById("billAmount"),
                setBillBtn: document.getElementById("setBill"),
                billMessage: document.getElementById("billMessage"),
                paidInput: document.getElementById("paidAmount"),
                submitBtn: document.getElementById("submitPayment"),
                personList: document.getElementById("personList"),
                errorMessage: document.getElementById("errorMessage"),
                remainingDisplay: document.getElementById("remainingAmount"),
                resetBtn: document.getElementById("resetAll"),
                undoBtn: document.getElementById("undoAction"),
                redoBtn: document.getElementById("redoAction"),
                transactionTable: document.getElementById("transactionTable").querySelector("tbody"),
                finalTable: document.getElementById("finalTable").querySelector("tbody"),
                paymentSection: document.getElementById("paymentSection"),
                dateTimeDisplay: document.getElementById("currentDateTime"),
                // NEW:
                newPersonInput: document.getElementById("newPersonName"),
                addPersonBtn: document.getElementById("addPersonBtn"),
            };

            this.undoStack = [];
            this.redoStack = [];

            this.initialize();
            this.updateDateTime();
        }

        // ---------- Persistence ----------
        saveState() {
            try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
            } catch (e) {
                console.warn("Could not save state:", e);
            }
        }

        loadState() {
            try {
                const raw = localStorage.getItem(this.STORAGE_KEY);
                if (!raw) return false;
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed.people) || typeof parsed.billAmount !== "number") {
                    return false;
                }
                this.state = {
                    billAmount: parsed.billAmount || 0,
                    remainingAmount: parsed.remainingAmount || 0,
                    people: parsed.people,
                    payments: parsed.payments || {},
                    transactions: parsed.transactions || [],
                    createdAt: parsed.createdAt || new Date().toISOString(),
                };
                return true;
            } catch (e) {
                console.warn("Could not load state:", e);
                return false;
            }
        }

        // ---------- Init + UI ----------
        initialize() {
            const hadSaved = this.loadState();

            // Backfill payments map & timestamp if first run
            this.state.people.forEach(p => {
                if (this.state.payments[p] == null) this.state.payments[p] = 0;
            });
            if (!hadSaved) {
                this.state.createdAt = new Date().toISOString();
            }

            this.renderPeople();
            this.addEventListeners();
            this.renderAll();
        }

        renderPeople() {
            // Render each as: [checkbox pill] [× remove]
            this.elements.personList.innerHTML = this.state.people.map((person, idx) => `
                <div class="person-row" data-person="${person}">
                    <label class="person">
                        <input type="checkbox" name="person" value="${person}" id="p-${idx}">
                        <span>${person}</span>
                    </label>
                    <button type="button" class="remove-person" aria-label="Remove ${person}" title="Remove ${person}">×</button>
                </div>
            `).join("");

            // Remove handlers
            this.elements.personList.querySelectorAll(".remove-person").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const row = btn.closest(".person-row");
                    const person = row?.dataset.person;
                    if (person) this.removePerson(person);
                });
            });
        }

        formatCurrency(amount) {
            return `€${(Number(amount) || 0).toFixed(2)}`;
        }

        pushState() {
            this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
            this.redoStack = [];
        }

        recalcFromTransactions() {
            // Remaining resets to full bill; then subtract all transactions.
            this.state.remainingAmount = this.state.billAmount;
            // Reset all owed allocations to 0 for current people only.
            const currentPeople = new Set(this.state.people);
            Object.keys(this.state.payments).forEach(p => {
                if (currentPeople.has(p)) this.state.payments[p] = 0;
            });

            // Replay historical transactions, but only credit shares to people
            // who still exist in the current people list.
            this.state.transactions.forEach(t => {
                const amountNum = parseFloat(String(t.amount).replace('€', '')) || 0;
                const txPeople = (t.people || "").split(', ').filter(Boolean);
                this.state.remainingAmount -= amountNum;
                const eligible = txPeople.filter(p => currentPeople.has(p));
                if (eligible.length > 0) {
                    const per = amountNum / eligible.length;
                    eligible.forEach(p => this.state.payments[p] += per);
                }
            });
        }

        renderAll() {
            // Reflect bill input state
            this.elements.billInput.value = this.state.billAmount || '';
            const billSet = this.state.billAmount > 0;
            this.elements.billInput.disabled = billSet;
            this.elements.setBillBtn.disabled = billSet;
            if (billSet) {
                this.elements.paymentSection.classList.remove('hidden');
            } else {
                this.elements.paymentSection.classList.add('hidden');
            }

            this.updateRemaining();
            this.updateTransactions();
            this.updateFinalSplit();

            this.elements.undoBtn.disabled = this.undoStack.length === 0;
            this.elements.redoBtn.disabled = this.redoStack.length === 0;

            this.saveState();
        }

        updateDateTime() {
            this.elements.dateTimeDisplay.textContent = new Date().toLocaleString();
            setInterval(() => {
                this.elements.dateTimeDisplay.textContent = new Date().toLocaleString();
            }, 1000);
        }

        updateRemaining() {
            this.elements.remainingDisplay.textContent = this.formatCurrency(this.state.remainingAmount);
        }

        updateTransactions() {
            this.elements.transactionTable.innerHTML = this.state.transactions.map((t, i) => `
                <tr>
                    <td>${t.amount}</td>
                    <td>${t.people}</td>
                    <td><button class="delete-btn" data-index="${i}" aria-label="Delete transaction">✕</button></td>
                </tr>
            `).join("");

            this.elements.transactionTable.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-index'));
                    this.deleteTransaction(idx);
                });
            });
        }

        updateFinalSplit() {
            if (!this.state.billAmount) {
                this.elements.finalTable.innerHTML = "";
                return;
            }
            const count = this.state.people.length || 1;
            const sharedRemaining = this.state.remainingAmount / count;
            this.elements.finalTable.innerHTML = this.state.people.map(person => `
                <tr>
                    <td>${person}</td>
                    <td>${this.formatCurrency((this.state.payments[person] || 0) + sharedRemaining)}</td>
                </tr>
            `).join("");
        }

        // ---------- People management ----------
        addPerson(nameRaw) {
            const name = (nameRaw || "").trim();
            if (!name) {
                this.elements.errorMessage.textContent = "Enter a valid name.";
                return;
            }
            const exists = this.state.people.some(p => p.toLowerCase() === name.toLowerCase());
            if (exists) {
                this.elements.errorMessage.textContent = `"${name}" already exists.`;
                return;
            }

            this.pushState();
            this.state.people.push(name);
            this.state.payments[name] = 0;

            // Recompute final split view (remaining share now includes the new person)
            this.renderPeople();
            this.renderAll();

            // Clear input + any error
            this.elements.newPersonInput.value = "";
            this.elements.errorMessage.textContent = "";
        }

        removePerson(name) {
            if (!this.state.people.includes(name)) return;

            const ok = confirm(`Remove "${name}" from this bill? Their allocated share in the current view will be removed (transactions remain unchanged).`);
            if (!ok) return;

            this.pushState();

            // Remove from people & payments
            this.state.people = this.state.people.filter(p => p !== name);
            delete this.state.payments[name];

            // Uncheck if currently ticked
            const checkbox = this.elements.personList.querySelector(`input[name="person"][value="${name}"]`);
            if (checkbox) checkbox.checked = false;

            // Recalculate allocations from history (ignoring removed person)
            this.recalcFromTransactions();

            this.renderPeople();
            this.renderAll();
        }

        // ---------- Core actions ----------
        setBill() {
            const amount = parseFloat(this.elements.billInput.value);
            if (isNaN(amount) || amount <= 0) {
                this.elements.billMessage.textContent = "Please enter a valid bill amount!";
                this.elements.billMessage.className = "error";
                return;
            }

            this.pushState();
            this.state.billAmount = amount;
            this.state.remainingAmount = amount;
            this.elements.billMessage.textContent = `Bill set to: ${this.formatCurrency(amount)}`;
            this.elements.billMessage.className = "success";

            this.renderAll();
        }

        submitPayment() {
            const amount = parseFloat(this.elements.paidInput.value);
            const selected = Array.from(
                this.elements.personList.querySelectorAll('input[name="person"]:checked')
            ).map(el => el.value);

            if (isNaN(amount) || amount <= 0) {
                this.elements.errorMessage.textContent = "Please enter a valid amount!";
                return;
            }
            if (amount > this.state.remainingAmount) {
                this.elements.errorMessage.textContent = `Amount exceeds remaining (${this.formatCurrency(this.state.remainingAmount)})!`;
                return;
            }
            if (!selected.length && this.state.remainingAmount > 0) {
                this.elements.errorMessage.textContent = "Please select at least one person!";
                return;
            }

            this.pushState();

            // Allocate only among selected people
            const perPerson = amount / selected.length;
            selected.forEach(person => {
                if (!(person in this.state.payments)) this.state.payments[person] = 0;
                this.state.payments[person] += perPerson;
            });

            this.state.remainingAmount -= amount;
            this.state.transactions.push({
                amount: this.formatCurrency(amount),
                people: selected.join(", "),
            });

            // Cleanup UI
            this.elements.errorMessage.textContent = "";
            this.elements.paidInput.value = "";
            this.elements.personList
                .querySelectorAll('input[name="person"]')
                .forEach(el => (el.checked = false));

            this.renderAll();
        }

        deleteTransaction(index) {
            if (index < 0 || index >= this.state.transactions.length) return;
            this.pushState();
            this.state.transactions.splice(index, 1);
            this.recalcFromTransactions();
            this.renderAll();
        }

        undo() {
            if (this.undoStack.length === 0) return;
            this.redoStack.push(JSON.parse(JSON.stringify(this.state)));
            this.state = this.undoStack.pop();
            // Repaint people UI (names may have changed)
            this.renderPeople();
            this.renderAll();
        }

        redo() {
            if (this.redoStack.length === 0) return;
            this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
            this.state = this.redoStack.pop();
            this.renderPeople();
            this.renderAll();
        }

        reset() {
            try { localStorage.removeItem(this.STORAGE_KEY); } catch (_) {}
            location.reload();
        }

        addEventListeners() {
            this.elements.setBillBtn.addEventListener("click", () => this.setBill());
            this.elements.billInput.addEventListener("keypress", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    this.setBill();
                }
            });
            this.elements.submitBtn.addEventListener("click", () => this.submitPayment());
            this.elements.resetBtn.addEventListener("click", () => this.reset());
            this.elements.undoBtn.addEventListener("click", () => this.undo());
            this.elements.redoBtn.addEventListener("click", () => this.redo());

            // Add person controls
            if (this.elements.addPersonBtn) {
                this.elements.addPersonBtn.addEventListener("click", () => {
                    this.addPerson(this.elements.newPersonInput.value);
                });
            }
            if (this.elements.newPersonInput) {
                this.elements.newPersonInput.addEventListener("keypress", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        this.addPerson(this.elements.newPersonInput.value);
                    }
                });
            }

            // Safety: event delegation for any dynamically added remove buttons
            this.elements.personList.addEventListener("click", (e) => {
                const btn = e.target.closest(".remove-person");
                if (!btn) return;
                e.stopPropagation();
                const row = btn.closest(".person-row");
                const person = row?.dataset.person;
                if (person) this.removePerson(person);
            });
        }
    }

    // Initialize the application
    new BillSplitter();
});
