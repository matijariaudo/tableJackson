import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoConnect from './DBconnect.js';
import multer from 'multer';
import fs from 'fs'
import { uploadS3 , showImg} from './s3.js';
import { generarLetrasNumeros } from './nroAzar.js';
import { revisar } from './app.js';
import userModel from './DBuser.js';
import bingoModel from './DBbingo.js';

import dotenv from 'dotenv'
import Registro from './DBbingo copy.js';
dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url));
console.log(__dirname);


const app = express();
await mongoConnect()
app.use(express.static(join(__dirname, 'public')));
app.use(express.json())

// Configurar multer para manejar la carga de archivos
const storage = multer.diskStorage({
  //destination: join(__dirname, 'uploads'), // Define la carpeta donde se guardarán los archivos
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Usa el nombre original del archivo
  }
});
const upload = multer({ storage: storage });


app.post('/user/new',async(req,res)=>{
    const {name,password}=req.body;
    console.log(name,password)
    if(!name || !password){
      return res.status(200).send({"req":"Error"})
    }
    const checkU=await userModel.findOne({name})
    if(checkU){
      const newBingo=new bingoModel({"name":"Nuevo Bingo",userId:checkU._id});
      await newBingo.save();
      return res.status(200).send({"error":"The user is already created"})}
    
    return res.status(200).send({checkU})
})

// Mostrar el formulario de carga de archivos
app.get('*', (req, res) => {
  console.log("Mostrando1")
  return res.sendFile(join(__dirname, 'public/index.html'))
});

app.get('/img/:name', async (req, res) => {
    const { name } = req.params;
    try {
        console.log(name)
        const imgUrl = await showImg(name);
        res.status(200).send(imgUrl);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener la imagen');
    }
});

app.post('/cambios', async (req, res) => {
    const { ids , valor} = req.body;
    // Buscar cualquier documento 'Bingo' que tenga al menos una canción con la ID proporcionada
    const bingo = await bingoModel.find({ 'bingo._id': { $in: ids } });
    if (!bingo) {
      return res.status(404).json({ error: 'No se encontró el documento Bingo que contiene las canciones proporcionadas.' });
    }
    console.log(bingo)
    bingo.forEach(async(b) => {
      b.bingo.forEach(song => {
        if (ids.includes(song._id.toString())) {
          // Realizar la actualización según tus requisitos
          console.log(song._id.toString(),"check")
          song.chequeado = valor; // Por ejemplo, actualizar el campo 'chequeado' a true
        }
      });
      await b.save();   
    });
    
    return res.status(200).json({ message: 'Canciones actualizadas exitosamente.' });

})

app.post('/delete', async (req, res) => {
  const { id , status} = req.body;
  // Buscar cualquier documento 'Bingo' que tenga al menos una canción con la ID proporcionada
  const bingo = await bingoModel.findById(id);
  if (!bingo) {
    return res.status(404).json({ error: 'No se encontró el documento Bingo que contiene las canciones proporcionadas.' });
  }
  bingo.active=status;
  await bingo.save()
  return res.status(200).json({ message: 'Canciones actualizadas exitosamente.' });
})

app.post('/user/img',async(req,res)=>{
  const {user_id}=req.body;
  if(!user_id){return res.status(400).send('Ha ocurrido un error al leer la imagen');}
  const img=await bingoModel.find({active:true,user_id});
  for (let i = 0; i < img.length; i++) {
    img[i].url= await showImg(img[i].url);
  }
  return res.status(200).send(img)
})

// Manejar la carga del archivo utilizando multer
app.post('/upload', upload.single('archivo'),async(req, res) => {
  // Verificar si req.file está definido antes de acceder a sus propiedades
  if (req.file) {
    const archivo = req.file;
    const {archivo_name,user_id} = req.body;
    const name=generarLetrasNumeros(21)+".jpg";
    const archivoStream = fs.createReadStream(archivo.path);
    await uploadS3("b-test-node-01",archivoStream,name)
    console.log(name)
    const contenido= await revisar(name,false);
    if(!contenido){return res.status(400).send('Ha ocurrido un error al leer la imagen');}
    res.status(200).send({contenido});
  } else {
    if(!req.body.img_token){return res.status(400).send('No se ha subido ningún archivo');}
    const {img_token}=req.body;
    const contenido= await revisar(img_token,false);
    if(!contenido){return res.status(400).send('Ha ocurrido un error al leer la imagen');}
    res.status(200).send({contenido});
  }
});

app.post('/uploadproduct', async(req, res) => {
  const {reg,suplier,date}=req.body;
  console.log(date)
  if(!reg){res.status(400).send({error:"No data"})}
  reg.forEach(e => {
    const {product,qty,code,price,pricet}=e;
    const registro=new Registro({product,qty,code,price,pricet,suplier,date});
    registro.save();
    console.log(registro)
  });
  res.status(200).send({data:req.body})
})
app.post('/getproduct', async(req, res) => {
  const {suplier,date}=req.body;
  const reg=await Registro.find({status:"active"})
  res.status(200).send({data:reg})
})

app.post('/upload2', async(req, res) => {
    //const contenido= await revisar("4TegCxEClH8tj5zLNZASy.jpg",false);
    //if(!contenido){return res.status(400).send('Ha ocurrido un error al leer la imagen');}
    res.status(200).send({
      "contenido": [
          [
              [
                  "1",
                  "1",
                  "EA",
                  "E1456",
                  "Chocolate - Milk 44% cocoa mass 2.5kg Callets",
                  "Gelato Messina",
                  "53.35",
                  "53.35",
                  "0.00",
                  "55.00"
              ],
              [
                  "1",
                  "1",
                  "EA",
                  "E0647",
                  "Curry Powder Mild 500g",
                  "Krio Krush",
                  "9.90",
                  "9.90",
                  "0.00",
                  "9.90"
              ],
              [
                  "2",
                  "2",
                  "CTN",
                  "E0453",
                  "Flour - Rice (Gluten Free) 500g x 12 (Red)",
                  "Erawan",
                  "21.75",
                  "43.50",
                  "0.00",
                  "43.50"
              ],
              [
                  "1",
                  "1",
                  "EA",
                  "E0434",
                  "Glucose (sugar) 5kg",
                  "Edlyn",
                  "42.45",
                  "42.45",
                  "0.00",
                  "42.45"
              ],
              [
                  "1",
                  "1",
                  "EA",
                  "E1329",
                  "Pistachio Kernels 1kg",
                  "Trumps",
                  "48.15",
                  "48.15",
                  "0.00",
                  "48.15"
              ],
              [
                  "1",
                  "1",
                  "EA",
                  "E0911",
                  "Salt - - Sea Rock 10kg",
                  "Olsson's",
                  "8.85",
                  "8.85",
                  "0.00",
                  "8.85"
              ],
              [
                  "1",
                  "1",
                  "CTN",
                  "E0270",
                  "Chocolate - Cacao Nibs Organic 300g x 10",
                  "Chefs Choice",
                  "60.65",
                  "60.65",
                  "0.00",
                  "60.65"
              ],
              [
                  "1",
                  "1",
                  "EA",
                  "E1821",
                  "Pepper-Aleppo - (Turkish Chilli) 250g",
                  "Herbies Spices",
                  "12.50",
                  "12.50",
                  "0.00",
                  "12.50"
              ],
              [
                  "1",
                  "1",
                  "EA",
                  "E0656",
                  "Garlic Powder 1kg",
                  "Krio Krush",
                  "14.50",
                  "14.50",
                  "0.00",
                  "14.50"
              ],
              null,
              [
                  "2",
                  "2",
                  "CTN",
                  "F0174",
                  "Bread - Martins Potato Sandwich 4\" X 48 (4x 12)",
                  "Martins",
                  "58.75",
                  "117.50",
                  "0.00",
                  "117.50"
              ]
          ]
      ]
  });
  
});

app.listen(process.env.PORT,()=>{console.log("Funcionando en puerto "+process.env.PORT)})

const x=[]
x.push(1)
console.log(x)