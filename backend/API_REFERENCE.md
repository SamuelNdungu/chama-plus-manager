# Chama Plus API Reference

## API Endpoints Structure

### Base URL
```
http://localhost:3001/api
```

---

## 🏢 Chamas Management

### GET /api/chamas
Get all chamas
```json
Response: [{
  "id": 1,
  "name": "Demo Chama",
  "description": "...",
  "contribution_amount": 1000.00,
  "total_funds": 50000.00,
  "total_members": 15
}]
```

### GET /api/chamas/:id
Get single chama details

### POST /api/chamas
Create new chama
```json
Request: {
  "name": "My Chama",
  "description": "Community savings group",
  "contribution_amount": 1000.00,
  "contribution_frequency": "monthly",
  "loan_interest_rate": 5.00,
  "welfare_contribution": 200.00
}
```

### PUT /api/chamas/:id
Update chama details

---

## 👥 Members Management

### GET /api/members
Get all members ✅ (Already implemented)

### GET /api/members/:id
Get member by ID ✅ (Already implemented)

### POST /api/members
Create new member ✅ (Already implemented)

### PUT /api/members/:id
Update member ✅ (Already implemented)

### DELETE /api/members/:id
Deactivate member

---

## 🔗 Chama Members (Membership)

### GET /api/chamas/:chamaId/members
Get all members of a specific chama

### POST /api/chamas/:chamaId/members
Add member to chama
```json
Request: {
  "member_id": 5,
  "member_number": "CM001",
  "share_amount": 5000.00
}
```

### DELETE /api/chamas/:chamaId/members/:memberId
Remove member from chama

---

## 💰 Contributions

### GET /api/contributions
Get all contributions with filters
```
Query params: ?chama_id=1&member_id=5&start_date=2026-01-01&end_date=2026-12-31
```

### GET /api/chamas/:chamaId/contributions
Get contributions for a specific chama

### GET /api/members/:memberId/contributions
Get member's contribution history

### POST /api/contributions
Record new contribution
```json
Request: {
  "chama_id": 1,
  "member_id": 5,
  "amount": 1000.00,
  "contribution_type": "regular",
  "payment_method": "mpesa",
  "reference_number": "PX123456",
  "contribution_date": "2026-02-04"
}
```

### GET /api/contributions/:id
Get contribution details

---

## 🏦 Loans

### GET /api/loans
Get all loans with filters
```
Query params: ?chama_id=1&status=active&member_id=5
```

### GET /api/chamas/:chamaId/loans
Get all loans for a chama

### GET /api/members/:memberId/loans
Get member's loan history

### POST /api/loans
Apply for loan
```json
Request: {
  "chama_id": 1,
  "member_id": 5,
  "principal_amount": 50000.00,
  "interest_rate": 5.00,
  "repayment_period": 12,
  "loan_purpose": "School fees",
  "loan_type": "education",
  "guarantor1_id": 3,
  "guarantor2_id": 7
}
```

### PUT /api/loans/:id/approve
Approve loan
```json
Request: {
  "approved_by": 2,
  "approval_date": "2026-02-04"
}
```

### PUT /api/loans/:id/disburse
Disburse loan
```json
Request: {
  "disbursed_by": 2,
  "disbursement_date": "2026-02-05",
  "disbursement_method": "bank_transfer"
}
```

### GET /api/loans/:id
Get loan details with payment history

---

## 💵 Loan Payments

### GET /api/loans/:loanId/payments
Get all payments for a loan

### POST /api/loan-payments
Record loan payment
```json
Request: {
  "loan_id": 15,
  "amount": 5000.00,
  "payment_method": "mpesa",
  "reference_number": "PX789012",
  "payment_date": "2026-02-04"
}
```

---

## ⚠️ Fines

### GET /api/fines
Get all fines
```
Query params: ?chama_id=1&member_id=5&status=pending
```

### GET /api/members/:memberId/fines
Get member's fines

### POST /api/fines
Issue fine
```json
Request: {
  "chama_id": 1,
  "member_id": 5,
  "fine_type": "late_contribution",
  "amount": 100.00,
  "reason": "Late payment for January",
  "due_date": "2026-02-10",
  "issued_by": 2
}
```

### PUT /api/fines/:id/pay
Pay fine
```json
Request: {
  "amount": 100.00,
  "payment_method": "cash",
  "payment_date": "2026-02-04"
}
```

### PUT /api/fines/:id/waive
Waive fine
```json
Request: {
  "waived_by": 2,
  "reason": "First offense"
}
```

---

## 🤝 Welfare

### GET /api/welfare-contributions
Get welfare contributions

### POST /api/welfare-contributions
Record welfare contribution
```json
Request: {
  "chama_id": 1,
  "member_id": 5,
  "amount": 200.00,
  "payment_method": "mpesa"
}
```

### GET /api/welfare-requests
Get welfare requests
```
Query params: ?status=pending&chama_id=1
```

### POST /api/welfare-requests
Submit welfare request
```json
Request: {
  "chama_id": 1,
  "member_id": 5,
  "request_type": "medical",
  "amount_requested": 10000.00,
  "reason": "Hospital bill for emergency surgery",
  "supporting_documents": "receipt.pdf"
}
```

### PUT /api/welfare-requests/:id/approve
Approve welfare request
```json
Request: {
  "amount_approved": 10000.00,
  "approved_by": 2,
  "approval_date": "2026-02-04"
}
```

### PUT /api/welfare-requests/:id/disburse
Disburse welfare funds
```json
Request: {
  "disbursed_by": 2,
  "disbursement_date": "2026-02-05"
}
```

---

## 📅 Meetings

### GET /api/meetings
Get all meetings
```
Query params: ?chama_id=1&status=completed&year=2026
```

### GET /api/chamas/:chamaId/meetings
Get chama meetings

### POST /api/meetings
Schedule meeting
```json
Request: {
  "chama_id": 1,
  "meeting_number": "2026-02",
  "meeting_date": "2026-02-15",
  "meeting_time": "14:00:00",
  "location": "Community Hall",
  "agenda": "Budget review and loan approvals",
  "chaired_by": 2,
  "secretary": 3
}
```

### PUT /api/meetings/:id
Update meeting (add minutes)
```json
Request: {
  "minutes": "Meeting minutes...",
  "total_collections": 15000.00,
  "status": "completed"
}
```

### GET /api/meetings/:id
Get meeting details with attendance

---

## ✓ Meeting Attendance

### GET /api/meetings/:meetingId/attendance
Get meeting attendance list

### POST /api/meetings/:meetingId/attendance
Record attendance
```json
Request: {
  "member_id": 5,
  "status": "present",
  "arrival_time": "14:05:00",
  "contribution_paid": 1000.00
}
```

### PUT /api/meetings/:meetingId/attendance/:memberId
Update attendance status

---

## 📊 Reports & Analytics

### GET /api/reports/chama-summary/:chamaId
Get chama financial summary
```json
Response: {
  "total_funds": 500000.00,
  "total_contributions": 300000.00,
  "total_loans_disbursed": 450000.00,
  "total_loans_outstanding": 200000.00,
  "total_welfare_fund": 50000.00,
  "total_fines_collected": 5000.00,
  "active_members": 15,
  "active_loans": 8
}
```

### GET /api/reports/member-statement/:memberId
Get member statement
```json
Response: {
  "member": {...},
  "total_contributions": 12000.00,
  "total_loans": 50000.00,
  "loans_repaid": 45000.00,
  "outstanding_balance": 5000.00,
  "welfare_contributions": 2400.00,
  "fines_paid": 200.00
}
```

### GET /api/reports/loan-portfolio/:chamaId
Get loan portfolio report

### GET /api/reports/defaulters/:chamaId
Get list of loan defaulters

### GET /api/reports/contributions-analysis/:chamaId
Contribution trends and analysis

---

## 📈 Dashboard Statistics

### GET /api/dashboard/chama/:chamaId
Get dashboard statistics
```json
Response: {
  "total_members": 15,
  "total_funds": 500000.00,
  "monthly_contributions": 15000.00,
  "active_loans": 8,
  "pending_welfare_requests": 2,
  "upcoming_meetings": 1,
  "recent_transactions": [...]
}
```

---

## 💱 Transactions

### GET /api/transactions
Get all transactions
```
Query params: ?chama_id=1&type=contribution&start_date=2026-01-01
```

### GET /api/transactions/:id
Get transaction details

---

## 🔐 Authentication (To Implement)

### POST /api/auth/register
Register new user

### POST /api/auth/login
User login

### POST /api/auth/logout
User logout

### GET /api/auth/me
Get current user

### PUT /api/auth/change-password
Change password

---

## Error Responses

All endpoints return consistent error format:
```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Implementation Priority

### Phase 1 (Core Features)
1. ✅ Members CRUD
2. Chamas CRUD
3. Chama Members (membership)
4. Contributions
5. Basic reports

### Phase 2 (Financial)
6. Loans
7. Loan Payments
8. Fines
9. Transactions ledger

### Phase 3 (Additional Features)
10. Meetings
11. Meeting Attendance
12. Welfare
13. Advanced reports

### Phase 4 (Production Ready)
14. Authentication
15. Authorization
16. Notifications
17. M-Pesa Integration
18. Backup & Recovery

---

## Testing

Use Postman, Insomnia, or curl to test endpoints:

```bash
# Example: Get all members
curl http://localhost:3001/api/members

# Example: Add contribution
curl -X POST http://localhost:3001/api/contributions \
  -H "Content-Type: application/json" \
  -d '{"chama_id": 1, "member_id": 5, "amount": 1000.00}'
```

---

## Notes

- All dates should be in `YYYY-MM-DD` format
- All times should be in `HH:MM:SS` format
- All amounts use decimal with 2 decimal places
- IDs are auto-generated integers
- Use query parameters for filtering GET requests
- Include proper error handling in all endpoints
- Validate all input data before processing
- Use transactions for multi-table operations
