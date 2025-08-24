import * as fs from 'fs';
import * as path from 'path';

// Specify the directory path containing your JSON files
const directoryPath = "data/whitelist";
try {
    // Read all files in the directory
    const files = fs.readdirSync(directoryPath);
    // files.filter(file => file.endsWith('.json')).forEach(file => {
    //     const id = path.basename(file, '.json');
    // });
     const fileIds = files
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json').trim());

    const fileContent = fs.readFileSync("app_ids_final.csv", 'utf-8');

  // Split content by lines and filter out empty lines
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');

  // Extract first column from each line
  const firstColumn = lines.map(line => line.split(',')[0].trim());
console.log(firstColumn[2])
    const fileIdsSet = new Set(fileIds); // Using Set for more efficient lookups
    const missingIds = firstColumn.filter(id => !fileIdsSet.has(id));

    const outputPath = "missing_ids.csv";
    fs.writeFileSync(outputPath, missingIds.join('\n'));
    console.log(`Missing IDs written to ${missingIds.length} : ${firstColumn.length-files.length}`);

}finally{}
