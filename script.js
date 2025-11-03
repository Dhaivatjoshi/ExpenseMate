document.addEventListener("DOMContentLoaded", () => {
    class BillSplitter {
        constructor() {
            this.state = {
                billAmount: 0,
                remainingAmount: 0,
                people: ["Apurv", "Dhaivat", "Nishant", "Rutvik"],
                payments: {},
                transactions: []
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
                dateTimeDisplay: document.getElementById("currentDateTime")
            };

            this.undoStack = [];
            this.redoStack = [];

            this.initialize();
            this.updateDateTime();
        }

        initialize() {
            this.state.people.forEach(person => this.state.payments[person] = 0);
            this.renderPeople();
            this.addEventListeners();
            this.renderAll();
        }

        renderPeople() {
            this.elements.personList.innerHTML = this.state.people.map(person => `
                <div class="person" data-person="${person}">${person}</div>
            `).join("");

            this.elements.personList.querySelectorAll(".person").forEach(btn => {
                btn.addEventListener("click", () => btn.classList.toggle("selected"));
            });
        }

        formatCurrency(amount) {
            return `€${parseFloat(amount).toFixed(2)}`;
        }

        pushState() {
            this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
            this.redoStack = [];
        }

        recalcFromTransactions() {
            this.state.remainingAmount = this.state.billAmount;
            this.state.people.forEach(p => this.state.payments[p] = 0);
            this.state.transactions.forEach(t => {
                const amount = parseFloat(t.amount.replace('€',''));
                const people = t.people.split(', ').filter(Boolean);
                this.state.remainingAmount -= amount;
                const per = amount / people.length;
                people.forEach(person => {
                    if (this.state.payments[person] === undefined) {
                        this.state.payments[person] = 0;
                    }
                    this.state.payments[person] += per;
                });
            });
        }

        renderAll() {
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
        }

        updateDateTime() {
            this.elements.dateTimeDisplay.textContent = new Date().toLocaleString();
            setInterval(() => {
                this.elements.dateTimeDisplay.textContent = new Date().toLocaleString();
            }, 1000); // Update every second
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

            const sharedRemaining = this.state.remainingAmount / this.state.people.length;
            this.elements.finalTable.innerHTML = this.state.people.map(person => `
                <tr>
                    <td>${person}</td>
                    <td>${this.formatCurrency(this.state.payments[person] + sharedRemaining)}</td>
                </tr>
            `).join("");
        }

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
            
            this.elements.billInput.disabled = true;
            this.elements.setBillBtn.disabled = true;
            this.elements.paymentSection.classList.remove("hidden");
            this.renderAll();
        }

        submitPayment() {
            const amount = parseFloat(this.elements.paidInput.value);
            const selected = Array.from(this.elements.personList.querySelectorAll(".person.selected"))
                .map(btn => btn.dataset.person);

            if (isNaN(amount) || amount <= 0) {
                this.elements.errorMessage.textContent = "Please enter a valid amount!";
                return;
            }

            if (amount > this.state.remainingAmount) {
                this.elements.errorMessage.textContent = `Amount exceeds remaining (${this.formatCurrency(this.state.remainingAmount)})!`;
                return;
            }

            if (!selected.length && this.state.remainingAmount > 0) {
                this.elements.errorMessage.textContent = "Please select at least one person or wait until bill is fully paid!";
                return;
            }

            this.pushState();
            this.state.remainingAmount -= amount;
            const people = selected.length ? selected : this.state.people;
            const perPerson = amount / people.length;

            people.forEach(person => this.state.payments[person] += perPerson);
            this.state.transactions.push({
                amount: this.formatCurrency(amount),
                people: people.join(", ")
            });

            this.elements.errorMessage.textContent = "";
            this.elements.paidInput.value = "";
            this.elements.personList.querySelectorAll(".person").forEach(btn => btn.classList.remove("selected"));

            this.renderAll();
        }

        deleteTransaction(index) {
            this.pushState();
            this.state.transactions.splice(index, 1);
            this.recalcFromTransactions();
            this.renderAll();
        }

        undo() {
            if (this.undoStack.length === 0) return;
            this.redoStack.push(JSON.parse(JSON.stringify(this.state)));
            this.state = this.undoStack.pop();
            this.renderAll();
        }

        redo() {
            if (this.redoStack.length === 0) return;
            this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
            this.state = this.redoStack.pop();
            this.renderAll();
        }

        reset() {
            location.reload();
        }

        addEventListeners() {
            this.elements.setBillBtn.addEventListener("click", () => this.setBill());
            this.elements.billInput.addEventListener("keypress", (event) => {
                if (event.key === "Enter") {
                    // Prevent the default Enter action so we can call setBill() immediately
                    event.preventDefault();
                    this.setBill();
                }
            });
            this.elements.submitBtn.addEventListener("click", () => this.submitPayment());
            this.elements.resetBtn.addEventListener("click", () => this.reset());
            this.elements.undoBtn.addEventListener("click", () => this.undo());
            this.elements.redoBtn.addEventListener("click", () => this.redo());
        }
    }

    // Initialize the application
    new BillSplitter();
});
