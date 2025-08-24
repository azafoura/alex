import os

input_dir = 'data/blacklist'
original_csv = 'first_column_only.csv'
blacklist_csv = 'blacklist.csv'

# Collect blacklist IDs from filenames (without extension)
blacklist_ids = []
for filename in os.listdir(input_dir):
    if filename.endswith('.txt'):
        blacklist_id = os.path.splitext(filename)[0]
        blacklist_ids.append(blacklist_id)
bl=[x+"\n" for x in blacklist_ids]
with open(blacklist_csv, 'w', encoding='utf-8') as f:
    f.writelines(bl)

# Read original CSV
with open(original_csv, encoding='utf-8') as f:
    lines = f.readlines()

header = lines[0]
rows = lines[1:]

# Separate rows: those in blacklist and those not
print(rows)
remaining_rows = [row for row in rows if row.split(',')[0].strip() not in blacklist_ids]
print('removed ' , len(rows)-len(remaining_rows))
# Write blacklist CSV


# Write updated original CSV
with open(original_csv, 'w', encoding='utf-8') as f:
    f.write(header)
    f.writelines(remaining_rows)