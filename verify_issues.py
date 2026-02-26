import json

data = json.load(open('CRM_ANALYSIS_REPORT.json'))
issues = data['issues']

print('Total Issues:', len(issues))
print()
print('BY CATEGORY:')
for k, v in data['metadata']['statistics']['issues_by_category'].items():
    print(f'  {k}: {v}')

print()
print('BY SEVERITY:')
for k, v in data['metadata']['statistics']['issues_by_severity'].items():
    print(f'  {k}: {v}')

print()
print('SAMPLE ISSUES (first 15):')
for i in issues[:15]:
    print(f'  [{i["severity"]}] {i["file"]}:{i["line"]} - {i["message"][:80]}')

print()
print('HIGH & CRITICAL ISSUES:')
high_issues = [i for i in issues if i['severity'] in ['HIGH', 'CRITICAL']]
for i in high_issues:
    print(f'  [{i["severity"]}] {i["file"]}:{i["line"]}')
    print(f'    Category: {i["category"]}')
    print(f'    Message: {i["message"]}')
    print(f'    Rec: {i.get("recommendation", "")[:80]}')
    print()
