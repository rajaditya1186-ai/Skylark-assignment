
AI Business Intelligence Agent Test Suite

1. General Chat Understanding
   TC-001

Input

How is our business doing?

Expected

Executive summary
KPIs
Insights
Risks
Recommendations
TC-002
Give me a leadership update.

Expected:

Leadership dashboard
Charts
Executive summary
TC-003
Summarize today's business performance.
TC-004
What should I know today?
2. Pipeline Analytics
TC-005
How many open opportunities do we currently have?

Expected

Open opportunity count
No work order information
TC-006
What is our total active pipeline?

Expected

Pipeline value
Opportunity count
TC-007
What is our weighted pipeline?

Expected

Uses probability calculations.

TC-008
Show pipeline by deal stage.

Expected

Bar chart

Stage breakdown

TC-009
Which stage has the highest pipeline?
TC-010
Show deals expected to close this quarter.
TC-011
How many deals are missing close dates?
TC-012
Show high probability opportunities.

Expected

Deals >80%

TC-013
Show low probability opportunities.
TC-014
List opportunities over $1M.
TC-015
What are our biggest deals?

Expected

Top 10 chart

3. Work Orders
   TC-016
   How many completed work orders do we have?
   TC-017
   Show delayed work orders.
   TC-018
   Show pending work orders.
   TC-019
   Show cancelled work orders.
   TC-020
   What is the execution status breakdown?

Expected

Bar chart

TC-021
How many invoices are pending?
TC-022
Show overdue work orders.
4. Cross-board Analytics
TC-023
Compare our sales pipeline with completed work orders.

Expected

Pipeline

Completed

Ratio

Insights

TC-024
Is delivery keeping up with sales?
TC-025
Compare deal volume versus delivery volume.
TC-026
Do we have enough delivery capacity?
TC-027
Which clients have both deals and work orders?
5. Forecasting
TC-028
Forecast next quarter revenue.
TC-029
Show expected revenue by month.

Expected

Line chart

TC-030
What revenue are we likely to close this month?
TC-031
What revenue has over 90% probability?
6. Data Quality
TC-032
Check data quality.
TC-033
Show missing close dates.
TC-034
Show duplicate deals.
TC-035
Which records have missing owners?
TC-036
Audit our CRM data.
TC-037
Are there malformed values?
7. Charts
TC-038
Show pipeline chart.

Expected

Pipeline bar chart

TC-039
Show revenue forecast.

Expected

Line chart

TC-040
Show work order status.

Expected

Bar chart

TC-041
Show opportunity distribution.

Expected

Pie chart

TC-042
Visualize top 10 deals.
8. Filtering
TC-043
Show opportunities owned by John.
TC-044
Show opportunities closing this month.
TC-045
Show only won deals.
TC-046
Show only lost deals.
TC-047
Show high priority opportunities.
9. Executive Questions
TC-048
What concerns should our CEO have?
TC-049
What are our biggest risks?
TC-050
What actions should leadership take?
TC-051
Generate board meeting summary.
TC-052
Prepare an executive report.
10. Ambiguous Queries
TC-053
How are we doing?

Expected

Overall business summary

TC-054
Tell me something important.
TC-055
Anything unusual?
TC-056
What's the biggest issue today?
11. Edge Cases
TC-057
Show deals over $100 billion.

Expected

No results

No crash

TC-058
Show work orders assigned to Batman.
TC-059
Show deals closing in 2050.
TC-060
Show customers named XYZ123.
12. Intent Detection
TC-061
How many open opportunities do we currently have?

Should NOT return

Leadership summary

TC-062
Compare our sales pipeline with completed work orders.

Should NOT return

Generic pipeline summary

TC-063
Generate leadership dashboard.

Should return

Dashboard

Charts

Summary

TC-064
Top deals.

Should return

Top deals only

TC-065
Delayed work orders.

Should NOT discuss

Pipeline

13. Error Handling
    TC-066

Disconnect Monday API.

Ask

Show my pipeline.

Expected

Graceful error

Retry

TC-067

Remove OpenAI key.

Ask

Leadership summary.

Expected

Meaningful error

TC-068

Empty board.

Ask

Show pipeline.

Expected

"No data available"

14. Performance
    TC-069

Ask

Pipeline summary.

Measure response time.

Target

<3 seconds

TC-070

Refresh dashboard repeatedly.

Expected

No duplicate API calls

TC-071

Run 20 different prompts.

Memory should remain stable.

15. Hallucination Tests
    TC-072
    Which salesperson generated the highest revenue?

If no owner data exists:

Expected

Cannot determine because owner assignments are missing.

Not a fabricated answer.

TC-073
Which sector generated the most revenue?

If no sector column exists:

Expected

Sector analysis unavailable because the Deals board has no Sector column.
TC-074
Which customer is likely to churn?

Expected

Insufficient data.

Not a guess.

16. Contradiction Tests
    TC-075

If delayed work orders = 0

Ask

Compare sales pipeline with work orders.

Expected

Must NOT recommend

Resolve delayed work orders.
TC-076

If missing owners = 0

Must NOT say

Assign deal owners.
TC-077

If no duplicates exist

Must NOT report

Duplicate records found.
17. Dynamic Data Tests
TC-078

Add a new deal in Monday.

Ask

How many open opportunities?

Expected

Count increases automatically.

TC-079

Change deal stage.

Ask

Pipeline by stage.

Expected

Chart updates.

TC-080

Complete a work order.

Ask

Compare sales pipeline with completed work orders.

Expected

Completed count updates.
