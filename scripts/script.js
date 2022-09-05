//---------------DECLARE MAJOR VARIABLES---------//
const mu = 127.3 //average age in RSNA BoneChallenge
const sigma = 41.2 //average std dev in RSNA Bone
//Arrays for the male and female GP reference ages
const maleArray = [0,3,6,9,12,15,18,24,32,36,42,48,54,60,72,84,96,108,120,132,138,150,156,162,168,180,186,192,204,216,228];
const femaleArray = [0,3,6,9,12,15,18,24,30,36,42,50,60,69,82,94,106,120,132,144,156,162,168,180,192,204,216];
//Location of the reference images for the sliders and files for the AI model
const refDir = "./tfjs/reference_images/"
const modelJSON ="./tfjs/model.json"
//Empty variables for the loaded model and uploaded immade
let model, immade; 
//Variables which run the entirety of the script.
let prediction=0.0;
let gpPredict=0; 
let defgd = 1; //dummy gender input
let arr = maleArray;

//Elements required for processing
//IMAGE
let fileInput = document.getElementById("file-upload")
//GENDER
let genderInput = document.querySelector("input[name='genderbut']:checked").value;
let genrep = document.getElementById("genderrep"); 
//DOB
let dobInput = document.querySelector('input[name="birthday"]');
let dobRep = document.getElementById("dobrep");

//-----------AI MODEL FUNCTIONS----------//
//Function to load the model
async function loadModel(){
    //loads model
    boneAgeModel = await tf.loadLayersModel(modelJSON)
    //Make dummy prediction to initialise model
    let im = new Image(); im.src = "./images/21.PNG"; im.height = 454.0;im.width = 333.0;
    let onLoad = tf.browser.fromPixels(im).toFloat();
    onLoad = preprocess_keras(onLoad);
    //Dummy gender, 1 = male, 0 = female
    let gd = gender_tensor((1));
    //Predict
    let predict = boneAgeModel.predict([onLoad,gd]);
    predict = predict.dataSync();
    predict = 127.3 + 41.2*predict;
    return boneAgeModel

}
//Preprocessing function for input images to model
function preprocess_keras(image){
    //Model is inceptionV3, need to resize to [224,224] and normalise to values [-1,1]
    let newIm = tf.image.resizeBilinear(image,[224,224]);
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
    let predict1 = model.predict([processedInput, processedGender]).arraySync()[0][0];
    predict1 = mu+sigma*(predict1);
    return predict1
}
//Function to get closest reference age from GP
function closest_GPage(estimatedAge, gender){
    //Gender //1 = male, 0 = female
    if (gender==1){
        arr = maleArray;
    } else if (gender ==0){
        arr =femaleArray;
    }
    let modifiedArr = arr.map(x => Math.abs(x-estimatedAge));
    let nearestValue = Math.min(...modifiedArr);
    let indexNear = modifiedArr.indexOf(nearestValue);
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
//----------REPORT UPDATE FUNCTIONS---------//
//Function that updates DOB when changed
function updateDOB(){
    let dobText = document.querySelector('input[name="birthday"]').value;
    let ageRepmo = document.getElementById('agerepmo')
    let ageRepyr = document.getElementById('agerepyr')
    let ageRepmo2 = document.getElementById('agerepmo2')
    let ageRepyr2 = document.getElementById('agerepyr2')
    //detour for age in months
    let ageArr = ageFromDob(dobText);
    ageRepyr.innerText = ageArr[0];
    ageRepmo.innerText = ageArr[1];
    ageRepyr2.innerText = ageArr[0];
    ageRepmo2.innerText = ageArr[1];
    //print out DOB to report
    dobText = dobText.split("-").reverse().join("-");
    dobRep.innerText = dobText;
}
//Function to get age from DOB string
function ageFromDob(datestring){
    if (Date.parse(datestring)==NaN){
        throw Error ('incomplete date string')
    } else {
        var today = new Date();
        var birthDate = new Date(datestring);
        var age = today.getFullYear() - birthDate.getFullYear();
        var m = today.getMonth() - birthDate.getMonth();
        //age = age * 12 + m; If want in puremonths
        return [age,m]
    }
}
//Updates reports with the major variables that change
function updateReport(){
    //Gender Update
    if (defgd==1){
        genrep.innerText='Male'
    }
    else if (defgd==0){
        genrep.innerText='Female'
    }
    //GP Age Update
    let gpRepA1 = document.getElementById("gpRepAge1");
    gpRepA1.innerText=ageFromMonths(gpPredict);
    let gpRepA2 = document.getElementById("gpRepAge2");
    gpRepA2.innerText=ageFromMonths(gpPredict);
    //DOB or Brush

}
//Function that updatesPrediction varibles prediction, gpPredict and gpIm
function updatePredictions(){
    //Update Variables
    prediction = predict_bone_age(immade,defgd);
    gpPredict = closest_GPage(prediction,defgd);
    gpPredIm = retrieveref(gpPredict,defgd);
}
//Function that makes predictions when file is uploaded and updates reports. Will also translate slideshow.
function getImage(){
    //Retrieves the uploaded image
    if(!fileInput.files[0]) throw new Error("Image not found");
    let file = fileInput.files[0];

    //get the data url from the image.
    const reader = new FileReader(); console.log('Filereader')
    //When reader is ready display the image.

    // When reader is ready display image
    reader.onload = function (event) {
        // Get the data url
        const dataUrl = event.target.result;
        //remove some elements
        document.getElementById('start').classList.add("hidden");
        document.getElementById('notimage').classList.add("hidden");
        // Thumbnail Preview
        document.getElementById('file-image').classList.remove("hidden");
        document.getElementById('file-image').src = URL.createObjectURL(file);
        // Create image object
        const imageElement = new Image();
        imageElement.src = dataUrl;

        // When image object is loaded
        imageElement.onload = function () {
            //Create image array for analysis;
            immade= tf.browser.fromPixels(imageElement).toFloat(); //set image to uploaded image
            updatePredictions();//will update gpPredict
            showGPageSlideShow();//requires gpPredict
            updateReport();
            //Change slider;
            
        };
        //Add the image-laoded class to the body
    };
    //get data URL
    reader.readAsDataURL(file)
}
//Events to happen when Gender is changed
function onGenderChange(){
    //Change gendervariable //male = 1, female = 0;
    let gtext = document.querySelector('input[name="genderbut"]:checked').value;
    if (gtext == 'male'){
        defgd = 1;
    } else if (gtext == 'female'){
        defgd= 0;
    }

    //Check if image uploaded;
    if (immade==undefined){
        if (defgd==1){
            genrep.innerText='Male'
        }
        else if (defgd==0){
            genrep.innerText='Female'
        }
        swapShownSlideshow();
        showGPageSlideShow();
        updateReport();
        throw new Error("Image not yet uploaded")
    } else{
        swapShownSlideshow();
        updatePredictions();
        showGPageSlideShow()
        updateReport();
    }
}
//revealElements when model has loaded
function revealElements (){
    document.getElementById('status').className=("hide"); //hide loading text
    document.getElementById('loaded').className=("loadspace"); // reveal ready for predictions text
    document.getElementById('sec1').className=("unhide"); // reveal form
}

//Load Model when page is visted

 loadModel().then((m) =>{
    model = m;
    revealElements();
    updateReport();
    fileInput.addEventListener("change", getImage);
    //Imageupload monitor
    fileInput.addEventListener("change", getImage);
    //Gender monitor
    let gdradios = document.querySelectorAll('input[type=radio][name="genderbut"]');
    gdradios.forEach(radio => radio.addEventListener("change", onGenderChange));
    //DOB monitor
    dobInput.addEventListener("input", updateDOB)
    console.log('Loaded model')
})
 


/*
revealElements();
updateReport();
fileInput.addEventListener("change", getImage);
//Imageupload monitor
fileInput.addEventListener("change", getImage);
//Gender monitor
let gdradios = document.querySelectorAll('input[type=radio][name="genderbut"]');
gdradios.forEach(radio => radio.addEventListener("change", onGenderChange));
//DOB monitor
dobInput.addEventListener("input", updateDOB)
console.log('Loaded model')
*/

//-------------IMAGE SLIDESHOW RELATED FUNCTIONS------------//
const slides = document.querySelectorAll(".slidem"); //male slides
const slidesf = document.querySelectorAll(".slideg"); //female slides
//SLIDESHOW CODE
let curSlidem = 0; curSlidef = 0;
let maxSlidem = slides.length-1; let maxSlidef = slidesf.length-1; //will change this for male and female.
// loop through slides and set each slides translateX property to index * 100% 
slides.forEach((slide, indx) => {
  slide.style.transform = `translateX(${indx * 100}%)`;
});
slidesf.forEach((slide, indx) => {
    slide.style.transform = `translateX(${indx * 100}%)`;
  });
//Next slide Functionality
const nextSlide = document.querySelector(".bth-next");
nextSlide.addEventListener("click", onNextBtn);
function onNextBtn(){
    //MALE
    if (curSlidem == maxSlidem || curSlidem > maxSlidem) {
        curSlidem = 0;
    } else {
        curSlidem++;
    }
    slides.forEach((slide,indx) => {
        slide.style.transform = `translateX(${100 * (indx - curSlidem)}%)`;
    });
    //FEMALE
    if (curSlidef == maxSlidef || curSlidef > maxSlidef) {
        curSlidef = 0;
    } else {
        curSlidef++;
    }
    slidesf.forEach((slide,indx) => {
        slide.style.transform = `translateX(${100 * (indx - curSlidef)}%)`;
    });
    GPageSlideshow();
    updateReport();
};
//Previous slide functionality
const prevSlide = document.querySelector(".bth-prev");
prevSlide.addEventListener("click", onPrevBtn);
function onPrevBtn(){
    //MALE
    if (curSlidem ===0){
        curSlidem = maxSlidem;
    } else {
        curSlidem = curSlidem-1;
    }
    slides.forEach((slide,indx) => {
        slide.style.transform = `translateX(${100 * (indx - curSlidem)}%)`;
    });
    //FEMALE
    if (curSlidef === 0) {
        curSlidef = maxSlidef;
    } else {
        curSlidef = curSlidef-1;
    }
    slidesf.forEach((slide,indx) => {
        slide.style.transform = `translateX(${100 * (indx - curSlidef)}%)`;
    });
    GPageSlideshow();
    updateReport();
};
//Function to swap slide show displayed from male to female, defaults to first slide (curSlide=0);
const divB = document.getElementById("divBoy");
const divG = document.getElementById("divGirl");
function swapShownSlideshow(){
    //checks gender selected via defgd variable and shows appropriate slideshow.
    if (defgd==0) {
        divB.className="slide-Hidden";
        divG.className="slide-Showing";
    } else if (defgd==1) {
        divB.className="slide-Showing";
        divG.className="slide-Hidden";
        console.log("bhidden")
    }
}
//Function to change the GPage in report based on current slide/gender
function GPageSlideshow(){
    if (defgd==1){
        gpPredict = maleArray[curSlidem];
    } else if (defgd==0){
        gpPredict = femaleArray[curSlidef];
    }
}
//Function to go to GPage predicted age; is run on imageUpload and OnGenderChange
function showGPageSlideShow(){
    let cur, arry, indexr
    if (defgd === 1) {
        arry= maleArray;
        cur= curSlidem;
        indexr=arry.indexOf(gpPredict);
    } else if (defgd === 0){
        arry = femaleArray;
        cur=curSlidef;
        if (gpPredict>220){
            indexr=femaleArray.length-1;
        } else {
            indexr=arry.indexOf(gpPredict);
        }
    }

    slides.forEach((slide,indx) => {
        slide.style.transform = `translateX(${100 * (indx-indexr)}%)`;
    });

    //female array shorter than the male so need to check if it maxes out.
        slidesf.forEach((slide,indx) => {
            slide.style.transform = `translateX(${100 * (indx-indexr)}%)`;
        });

    //updateCurrSlideLocation;
        curSlidem = indexr;
    if (indexr > femaleArray.length){
        curSlidef = femaleArray.length
    } else {
        curSlidef = indexr;
    }
}

//Function to give back string of "x years y months" from unput of months
function ageFromMonths(ageMonths){
    let years = Math.floor(ageMonths/12)
    let months = Math.floor(ageMonths-(12*years))
    let text = years + " years " + months + " months."
    return(text);
}