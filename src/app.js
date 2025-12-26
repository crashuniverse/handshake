import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Calculate Interest
function calculateLoanDetails(loan) {
  const now = new Date();
  const start = new Date(loan.start_date);
  
  // Time difference in years
  const diffTime = Math.abs(now - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  const years = diffDays / 365;

  // Simple Interest: P * R * T
  // Rate is in percentage, so divide by 100
  const interestAccrued = loan.amount * (loan.interest_rate / 100) * years;
  const totalAmount = loan.amount + interestAccrued;

  return {
    ...loan,
    interest_accrued: interestAccrued.toFixed(2),
    total_amount: totalAmount.toFixed(2),
    days_elapsed: diffDays
  };
}

function getChartData(loan) {
  const labels = [];
  const principalData = [];
  const totalData = [];
  
  const start = new Date(loan.start_date);
  const now = new Date();
  
  // Generate points: Start Date, then every month until Now.
  let current = new Date(start);
  
  // Safety break to prevent infinite loops if dates are weird
  let iterations = 0;
  while (current <= now && iterations < 1000) {
    labels.push(current.toISOString().split('T')[0]);
    principalData.push(loan.amount);
    
    const diffTime = Math.abs(current - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const years = diffDays / 365;
    const interest = loan.amount * (loan.interest_rate / 100) * years;
    totalData.push(Number((loan.amount + interest).toFixed(2)));
    
    // Increment by 1 month
    current.setMonth(current.getMonth() + 1);
    iterations++;
  }
  
  // Ensure "Now" is the last point
  const todayStr = now.toISOString().split('T')[0];
  if (labels[labels.length - 1] !== todayStr) {
    labels.push(todayStr);
    principalData.push(loan.amount);
    
    const diffTime = Math.abs(now - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const years = diffDays / 365;
    const interest = loan.amount * (loan.interest_rate / 100) * years;
    totalData.push(Number((loan.amount + interest).toFixed(2)));
  }
  
  return { labels, principalData, totalData };
}

function getGrowthSchedule(loan) {
  const schedule = [];
  const start = new Date(loan.start_date);
  const now = new Date();
  let current = new Date(start);
  
  // Initial state
  schedule.push({
    date: start.toISOString().split('T')[0],
    days_elapsed: 0,
    interest_accrued: "0.00",
    total: loan.amount.toFixed(2),
    note: "Loan Start Date. No interest accrued yet."
  });

  // Move to next month
  current.setMonth(current.getMonth() + 1);
  
  let iterations = 0;
  while (current <= now && iterations < 1000) {
    const diffTime = Math.abs(current - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const years = diffDays / 365;
    const interest = loan.amount * (loan.interest_rate / 100) * years;
    const total = loan.amount + interest;
    
    let note = "";
    // Explain the first few rows
    if (schedule.length <= 3) {
      note = `<strong>Formula:</strong> P × R × T <br>` +
             `₹${loan.amount} × ${loan.interest_rate}% × (${diffDays}/365 years) = ₹${interest.toFixed(2)}`;
    }

    schedule.push({
      date: current.toISOString().split('T')[0],
      days_elapsed: diffDays,
      interest_accrued: interest.toFixed(2),
      total: total.toFixed(2),
      note: note
    });
    
    current.setMonth(current.getMonth() + 1);
    iterations++;
  }

  // Ensure "Today" is included if not already
  const lastDate = schedule[schedule.length - 1].date;
  const todayStr = now.toISOString().split('T')[0];
  
  if (lastDate !== todayStr) {
     const diffTime = Math.abs(now - start);
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
     const years = diffDays / 365;
     const interest = loan.amount * (loan.interest_rate / 100) * years;
     const total = loan.amount + interest;
     
     schedule.push({
      date: todayStr,
      days_elapsed: diffDays,
      interest_accrued: interest.toFixed(2),
      total: total.toFixed(2),
      note: "<strong>Today (Current Status)</strong>"
    });
  }
  
  return schedule;
}

// Routes
app.get('/', (req, res) => {
  const sql = 'SELECT * FROM loans ORDER BY created_at DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return console.error(err.message);
    }
    const loans = rows.map(calculateLoanDetails);
    res.render('index', { title: 'Handshake Dashboard', loans });
  });
});

app.get('/loans/new', (req, res) => {
  res.render('new_loan', { title: 'Create New Loan' });
});

app.get('/loans/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM loans WHERE id = ?';
  db.get(sql, [id], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    if (!row) {
      return res.status(404).send('Loan not found');
    }
    const loan = calculateLoanDetails(row);
    const chartData = getChartData(loan);
    const growthSchedule = getGrowthSchedule(loan);
    res.render('show_loan', { title: loan.name, loan, chartData, growthSchedule });
  });
});

app.post('/loans', (req, res) => {
  const { name, lender, borrower, amount, interest_rate, duration_months, start_date } = req.body;
  const sql = `INSERT INTO loans (name, lender, borrower, amount, interest_rate, duration_months, start_date) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const params = [name, lender, borrower, amount, interest_rate, duration_months, start_date];
  
  db.run(sql, params, function(err) {
    if (err) {
      return console.error(err.message);
    }
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
