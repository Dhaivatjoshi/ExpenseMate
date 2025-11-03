# Bill Splitter

## Overview
We built this project because we faced problems splitting our bill in Splitwise. Using this web-based splitter, we can now easily split an item's price, whether it is between 2 people or 4 people. Just by selecting the person's name, you can quickly split the bill.

## Features
- Set a total bill amount.
- Record individual payments.
- Calculate and display the remaining balance.
- Show transactions in a table.
- Display final amount owed by each person.
- Delete individual transactions.
- Undo or redo recent changes.
- Reset all data for a new bill.

## Technologies Used
- HTML
- CSS
- JavaScript

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/bill-splitter.git
   ```
2. Navigate to the project folder:
   ```sh
   cd bill-splitter
   ```
3. Install the dependencies:
   ```sh
   npm install
   ```
4. Run the test suite:
   ```sh
   npm test
   ```
5. Open `index.html` in a browser.

Or use this URL [dhaivatjoshi.github.io/ExpenseMate/](https://dhaivatjoshi.github.io/ExpenseMate/)

## Usage
1. Enter the total bill amount and click "Set Bill."
2. Add payments made by different participants.
3. View the remaining balance and transaction history.
4. See the final split amounts owed by each person.
5. Click "Reset All" to start a new session.

## Running Tests
After installing dependencies, run:
```sh
npm test
```

## Future Enhancements
- **Add dynamic add/remove friend feature.**
- **Add a Share button to share the final bill split to Splitwise.**
  - Since this project doesn't have a database, this will make it easy to maintain.
  - We will share this bill using the Splitwise API.

## Contributing
Contributions are welcome! If you'd like to improve this project:
1. Fork the repository.
2. Create a new branch (`feature-branch`).
3. Commit your changes.
4. Push to your fork and submit a pull request.

## License
This project is open-source and available under the [MIT License](LICENSE).
