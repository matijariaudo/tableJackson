import { TextractClient, DetectDocumentTextCommand,AnalyzeDocumentCommand} from "@aws-sdk/client-textract";
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()


// a client can be shared by different commands.
const client = new TextractClient({ 
    region:'us-east-1',
    credentials: {
        accessKeyId:process.env.AWS_KEY_ID,
        secretAccessKey:process.env.AWS_SECRET
    }
});


export async function revisar(nameArchivo,local=true)
{
    console.log("Iniciando",local)
    let Document;let imageBytes;
    if(local){imageBytes = fs.readFileSync(nameArchivo);}
    !local?Document={S3Object:{Bucket: 'b-test-node-01',Name: nameArchivo}}:Document={Bytes: imageBytes}
    const params = {
        Document,
        FeatureTypes: ['TABLES']
    };

try {
    const command = new AnalyzeDocumentCommand(params);
    const response = await client.send(command);
    //console.log(response)
    const blocks=response.Blocks;
    //console.log(blocks)
    const tables = blocks.filter(block => block.BlockType === 'TABLE');
    // Initialize the table array to store rows
    let tableData = [];
    tables.forEach((table,x) => {
        //console.log('Table:', table);
        const rows = [];
        table.Relationships.forEach(relationship => {
            if (relationship.Type === 'CHILD') {
                const cells = relationship.Ids.map(id => blocks.find(block => block.Id === id));
                rows.push(cells);
            }
        });
        
        const tableInd=[]
        rows.forEach((row, rowIndex) => {
            console.log(`Row ${rowIndex + 1}:`);
            row.forEach(cell => {
                if (cell.BlockType === 'CELL' && cell.Relationships) {
                    const cellText = extracText(cell,blocks)
                    !tableInd[cell.RowIndex-1]?tableInd[cell.RowIndex-1]=[cellText]:tableInd[cell.RowIndex-1].push(cellText)
                    console.log(`  Cell (${cell.RowIndex}, ${cell.ColumnIndex}): ${cellText}`);
                    console.log(cell)
                }
            });
        });
        tableData[x]=tableInd;
    });
    return  tableData;    
  } catch (error) {
    console.log(error)
  }
}

//revisar("jcOrVzmwrrIbW4w0YoSrG.jpg")

function extracText(cell,blocks){
    const text=cell.Relationships
    .filter(relationship => relationship.Type === 'CHILD')
    .flatMap(relationship => 
        relationship.Ids.map(id => blocks.find(block => block.Id === id))
    )
    .filter(block => block.BlockType === 'WORD')
    .map(word => word.Text)
    .join(' ');
    return text;
}