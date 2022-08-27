//SCRIPT FOR THE BONE AGE PREDICTION MODEL
console.log('Working')

// CONSTANTS FOR PREDICTIONS
const mu = 127.3 //average age in RSNA BoneChallenge
const sigma = 41.2 //average std dev in RSNA Bone
const maleArray = [0,3,6,9,12,15,18,24,32,36,42,48,54,60,72,84,96,108,120,132,138,150,156,162,168,180,186,192,204,216,228];
const femaleArray = [0,3,6,9,12,15,18,24,30,36,42,50,60,69,82,94,106,120,132,144,156,162,168,180,192,204,216];
const refDir = "http://127.0.0.1:8887/tfjs/reference_images/"

//Function to load the model
async function loadModel(){
    //loads model
    boneAgeModel = await tf.loadLayersModel("http://127.0.0.1:8887/tfjs/model.json")
    //Make dummy prediction to initialise model
    //Import dummy image and preprocess;
    let im = new Image(); im.src = "./images/29.PNG"; im.height = 454.0;im.width = 333.0;
    let onLoad = tf.browser.fromPixels(im).toFloat();
    onLoad = preprocess_keras(onLoad);
    //Dummy gender, 1 = male, 0 = female
    gd = gender_tensor((1));
    //Predict
    let predict = boneAgeModel.predict([onLoad,gd]);
    predict = predict.dataSync();
    predict = 127.3 + 41.2*predict;
    console.log(predict)

    return boneAgeModel

}

//Preprocessing function for input images to model
function preprocess_keras(image){
    //Model is inceptionV3, need to resize to [224,224] and normalise to values [-1,1]
    newIm = tf.image.resizeBilinear(image,[224,224]);
    const offset = tf.scalar(127.5).toFloat();
    const normn = tf.scalar(1).toFloat();
    newIm = newIm.div(offset).sub(normn).expandDims(axis=0).toFloat();
    return newIm;
    
}

//Function for creating gender tensor for bone_age_model
function gender_tensor(x){
    //let male = 1, female = 0
    if (x != 1 && x != 0 ){
        throw 'Invalid gender input';
    }
    gd=tf.expandDims(x,axis=0).toFloat();
    return gd
}

//Function prediction for a given input - is not async
function predict_bone_age(input_image,input_gender){ 
    const processedInput = preprocess_keras(input_image);
    const processedGender = gender_tensor(input_gender); //1 = male, 0 = female
    let predict = boneAgeModel.predict([processedInput, processedGender]).arraySync()[0][0];
    predict = mu+sigma*(predict);
    return predict
}

//Function to get closest GP age
function closest_GPage(estimatedAge, gender){
    //Gender //1 = male, 0 = female
    if (gender==1){
        arr = maleArray;
    } else if (gender ==0){
        arr =femaleArray;
    }
    modifiedArr = arr.map(x => Math.abs(x-estimatedAge));
    nearestValue = Math.min(...modifiedArr);
    indexNear = modifiedArr.indexOf(nearestValue);
    gpAge = arr[indexNear]
    return gpAge
}

//Function to get string of the closest GP age
function retrieveref(GPage,gender){
    //Returns a string for path to desired refernece image for GP-age and gender
    //Gender 1 = male, 0 = female
    if (gender==1){
        gen = 'male';
    } else if (gender == 0){
        gen = 'female';
    }
    imdir = refDir + gen + "/" + GPage.toString() + ".PNG"; //location of the image
    return imdir;
}

function getImage(){

}

let fileInput = document.getElementById("file-upload")
let image = document.getElementById("file-image")

