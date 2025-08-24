import os
import json

input_dir = 'data/whitelist'
lis=[]
for filename in os.listdir(input_dir):
    if filename.endswith('.json'):
        filepath = os.path.join(input_dir, filename)
        with open(filepath, encoding='utf-8') as f:
            content = json.load(f)
            inner = next(iter(content.values()))
            if ('banip'in inner) or (inner.get('code') == 404):
                os.remove(filepath)
                lis.append[filename[:5]]


input_dir = 'data/whitelist'
output_csv = 'output.csv'
iset=[]

for filename in os.listdir(input_dir):
    if filename.endswith('.json'):
        with open(os.path.join(input_dir, filename), encoding='utf-8') as f:
            content = json.load(f)
            for id_, info in content.items():
                iset.append(id_)
with open("first_column_only.csv","r") as f:
    rows=f.readlines()
    print(len(iset),type(iset[0]))

final=[row for row in rows if row.split(',')[0].strip() not in iset]
print('removed ' , len(rows)-len(final))

with open("first_column_only.csv", "w") as f:
 # column name
    for row in final:
        f.write(row)
