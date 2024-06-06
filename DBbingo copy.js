import { Schema ,model } from 'mongoose';

const productSchema=new Schema({
    product:String,
    qty:String,
    code:String,
    price:String,
    pricet:String,
    suplier:String,
    date: {
        type:String,
        default:new Date()
    },
    status:{
        type:String,
        default:"active"
    }
})

//quita el password de la rta
productSchema.methods.toJSON= function(){
    const {_v,_id,... dat}=this.toObject();
    dat.id=_id;
    return dat;
}

const Registro=model('Registro',productSchema);
export default Registro;