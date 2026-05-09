import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

//Animates the ThreeJS Viewport
function animate(){
    controls.update();
    requestAnimationFrame(animate);
    effectComp.render();
}

//Fixes size if size is not the same as previously assigned
function fixViewportSize(){
    if(renderer){
        if(renderer.getSize(new THREE.Vector2()).x > window.innerWidth){
            rendererW = window.innerWidth;
            rendererH = rendererW/1.78;
        }else{
            rendererH = window.innerHeight*.6;
            rendererW = rendererH*1.78; //1.78:1 Aspect ratio
        }
        if(window.innerWidth<500){
            console.log("Phone");
            rendererW = window.innerWidth*.8;
            rendererH = rendererW*.7;
        }
        effectComp.setPixelRatio(window.devicePixelRatio);
        rect = renderer.domElement.getBoundingClientRect();
        renderer.setSize(rendererW,rendererH);
        camera.aspect = rendererW/rendererH;
    }
}

//Creates an object based off button input
function simpleObjCreate(opt,col=0xcccccc,x=1,y=1,z=1,segm=48){
    let meshMat = new THREE.MeshStandardMaterial({
        color: col,
        flatShading: true,
        side: THREE.DoubleSide
    });
    let geoBuffer;
    switch(opt){
        case "Cube":
            geoBuffer = new THREE.BoxGeometry(x,y,z); break;
        case "Cylinder":
            geoBuffer = new THREE.CylinderGeometry(x/2,y/2,z,segm); break;
        case "Pyramid":
            geoBuffer = new THREE.ConeGeometry(x/2,y,4); break;
        case "Cone":
            geoBuffer = new THREE.ConeGeometry(x/2,y,segm); break;
        case "Sphere":
            geoBuffer = new THREE.SphereGeometry(x/2,segm,segm); break;
        case "Circle":
            geoBuffer = new THREE.CircleGeometry(x/2,segm); break;
        default:
            console.log("Out");
            return 0;
    }
    let geoMesh = new THREE.Mesh(geoBuffer,meshMat);
    geoMesh.userData.selectable = true;
    geoMesh.userData.selected = false;
    geoMesh.userData.defaultColor = geoMesh.material.color;
    geoMesh.frustumCulled = false;
    geoMesh.castShadow = true;
    scene.add(geoMesh);
    return geoMesh;
}

//Basics: Renderer, Camera ed Scene
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true
});
let rendererH = window.innerHeight*.6;
let rendererW = rendererH*1.78; //1.78:1 Aspect ratio
if(window.innerWidth<500){
    console.log("Phone");
    rendererW = window.innerWidth*.8;
    rendererH = rendererW*.7;
}
renderer.setSize(rendererW,rendererH);

const viewportDiv = document.getElementById("viewport");
viewportDiv.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
    87,
    rendererW/rendererH,
    0.00001,
    100
);
camera.position.z = 5;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
renderer.render(scene,camera);

//Post Processing (Effect Composer)
const effectComp = new EffectComposer(renderer);
const renderPass = new RenderPass(scene,camera);
effectComp.addPass(renderPass);
const outlinePass= new OutlinePass(
      new THREE.Vector2(rendererW,rendererH),
      scene,
      camera
);
outlinePass.edgeGlow = 0;
outlinePass.visibleEdgeColor = new THREE.Color(0xffa500);
outlinePass.edgeThickness = 1;

outlinePass.renderToScreen = true;
effectComp.addPass( outlinePass );

const fxaa = new ShaderPass(FXAAShader);
const pixelRatio = renderer.getPixelRatio();
fxaa.material.uniforms['resolution'].value.x = 1 / (rendererW * pixelRatio);
fxaa.material.uniforms['resolution'].value.y = 1 / (rendererH * pixelRatio);
effectComp.addPass(fxaa);

//OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.4;

//Starts the animate function
animate();

//Event listeners for window resizing and scrolling to ensure viewport keeps dimensions/positioning
window.addEventListener("resize",function()
{
    fixViewportSize();
});

window.addEventListener("scroll",function()
{
    fixViewportSize();
});

//Array for holding objects that have been created
const objArr = [];
const objOpt = document.getElementsByClassName("addOpt");
for(let i=0;i<objOpt.length;i++){
    objOpt[i].addEventListener("click",function(){
        let objCreated = simpleObjCreate( (objOpt[i].innerHTML).replace(/\s/g,"") )
        objCreated.name = (objOpt[i].innerHTML).replace(/\s/g,"");
        if(objCreated){
            objArr.push(objCreated);
        }
    });
}

//Functionality for the clear
const clearButton = document.getElementById("clearButton");
clearButton.addEventListener("click",function(){
    for(let i=objArr.length-1;i>=0;i--){
        scene.remove(objArr[i]);
        objArr.pop();
    }
});

//Updates the Camera FOV
const fovLabel = document.getElementById("fovLabel");
const fovSlider = fovLabel.nextElementSibling.nextElementSibling;
fovLabel.textContent = `${fovSlider.value}\u00B0 FOV`;
window.addEventListener("input",function(){
    camera.fov = fovSlider.value;
    fovLabel.textContent = `${fovSlider.value}\u00B0 FOV`;
    camera.updateProjectionMatrix();
});

const raycaster = new THREE.Raycaster();
const mousePos = new THREE.Vector2(); //where the mouse clicked
let select;
let rect = renderer.domElement.getBoundingClientRect();
window.addEventListener("click",function(event){
    mousePos.x = ((event.clientX - rect.left) / rendererW)*2 - 1;
    mousePos.y = -((event.clientY - rect.top) / rendererH)*2 + 1;
    if(select && select.userData.selected && Math.abs(mousePos.x)<1 && Math.abs(mousePos.y)<1){ //Should only occur if there was an already selected object
        select.material.color = select.userData.defaultColor;
        outlinePass.selectedObjects.pop();
        select.userData.selected = false;
    }
    raycaster.setFromCamera(mousePos,camera);
    const intObj = raycaster.intersectObjects(scene.children).find(i => i.object.type != "GridHelper" && i.object.type!="AxesHelper"); //Filters out GridHelper and AxesHelper
    if(intObj && intObj.object.userData.selectable){
        select = intObj.object;
        outlinePass.selectedObjects = [ select ];
        select.material.color = new THREE.Color(0xffedaa);
        select.userData.selected = true;
    }
    propertyHandler(outlinePass.selectedObjects);
});


const propertySub = document.getElementById("properties-toggle").nextElementSibling.nextElementSibling;
let noSelectText = document.createElement("p");
noSelectText.textContent = "No object selected.";
noSelectText.style.fontSize = ".75em";
propertySub.appendChild(noSelectText);

function propertyHandler(obj){
    propertySub.replaceChildren();
    propertySub.appendChild(noSelectText);
    if(!obj.length){
        propertySub.appendChild(noSelectText);
        noSelectText.textContent = "No object selected.";
        return;
    }
    noSelectText.textContent = `${obj[0].name} selected`;
    if(propertySub.children.length<=1){
        objBasicProperties(obj[0]);
    }
}

function objBasicProperties(obj){
    let propArr = [Object.entries(obj.scale),Object.entries(obj.rotation).slice(1,4),Object.entries(obj.position)];
    for(let i = 0;i<propArr[1].length;i++){
        propArr[1][i][0] = propArr[1][i][0].substring(1);
    }
    let currText = "";
    for(let i in propArr){
        switch(i){
            case "0":
                currText = "Scale";
                setProperties(obj.scale,propArr[0],currText);
                break;
            case "1":
                currText = "Rot";
                setProperties(obj.rotation,propArr[1],currText);
                break;
            case "2":
                currText = "Pos";
                setProperties(obj.position,propArr[2],currText);
                break;
            }
        }
    }

    function setProperties(obj,arr,text){
        for(let j in arr){
                let addLabel = document.createElement("label");
                addLabel.innerHTML = arr[j][0] + ` ${text}:\n`;
                addLabel.setAttribute("for",`${arr[j][0]}${text}Input`);

                let addInput = document.createElement("input");
                addInput.setAttribute("type","range");
                addInput.setAttribute("id",`${arr[j][0]}${text}Input`); 
                addInput.setAttribute("step",".01");
                addInput.setAttribute("min","-10");
                addInput.setAttribute("max","10");
                switch (j){
                        case "0":
                            addInput.setAttribute("value",String(obj.x));
                            break;
                        case "1":
                            addInput.setAttribute("value",String(obj.y));
                            break;
                        case "2":
                            addInput.setAttribute("value",String(obj.z));
                            break;
                    }
                addInput.addEventListener("input",function(){
                    switch (j){
                        case "0":
                            obj.x = addInput.value;
                            break;
                        case "1":
                            obj.y = addInput.value;
                            break;
                        case "2":
                            obj.z = addInput.value;
                            break;
                    }
                });
                propertySub.appendChild(addLabel);
                propertySub.appendChild(addInput);
                propertySub.appendChild(document.createElement("br"));
            }
        propertySub.appendChild(document.createElement("br"));
    }

let lightObj = new THREE.DirectionalLight({intensity: 2});
scene.add(lightObj);
let lightObj2 = new THREE.AmbientLight({intensity: 2});
scene.add(lightObj2);

let axesHelper = new THREE.AxesHelper();
scene.add(axesHelper);
axesHelper.position.copy(new THREE.Vector3(0,.001,0))

let gridHelper = new THREE.GridHelper(200,200,0xffffff);
scene.add(gridHelper);