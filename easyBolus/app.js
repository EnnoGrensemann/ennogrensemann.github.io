const jsonFilePath = "./storage.json"

//VARs
//==========================================================================
let storage = null
let ReadStorageCompleted = false
let localStorageKey = "speicher"
//==========================================================================



//==========================================================================
//Read, Write, Sort, Import, Export
//==========================================================================
async function importFromFile(File){
    try {
        const response = await fetch(File);
        const jsonData = await response.json();
        storage = jsonData;
        sortProducts()
        saveLocalStorage()

    } catch (error) {
        console.error('Fehler beim Abrufen oder Verarbeiten der Daten:', error);
    }
}

function exportToFile(File) {
    const jsonString = JSON.stringify(storage, null, 2);
    const downloadFileName = File;
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUri;
    downloadLink.download = downloadFileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function saveLocalStorage(){
    const jsonString = JSON.stringify(storage);
    localStorage.setItem(localStorageKey, jsonString);
}

function loadLocalStorage(){
    const jsonStringFromStorage = localStorage.getItem(localStorageKey);
    storage = JSON.parse(jsonStringFromStorage);
}


function sortProducts(){
    if (storage && storage.productList) {
      const sortedProducts = Object.keys(storage.productList)
        .map(productId => storage.productList[productId])
        .sort((a, b) => a.NAME.localeCompare(b.NAME));
      const sortedProductList = {};
      const usedIds = new Set();
      sortedProducts.forEach(product => {
        let productId;
        do {
            productId = Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
          } while (usedIds.has(productId));
          usedIds.add(productId);
        sortedProductList[productId] = product;
      });
      storage.productList = sortedProductList;
    }
  }

function printStorageToConsole(){
    if(storage != null){
        console.log('Produkte');
        console.log('---------------------------------------------');
        const productList = storage.productList
        Object.keys(productList).forEach(ID => {
        const product = productList[ID];
        console.log(`Produkt-ID: ${ID}`);
        console.log(`Produktname: ${product.NAME}`);
        console.log(`Menge: ${product.AMOUNT} ${product.UNIT}`);
        console.log(`KH: ${product.KH}`);
        console.log('');
        });
        console.log('Bolus Settings');
        console.log('---------------------------------------------');
        const bolusSettings = storage.settings.bolus;
        Object.keys(bolusSettings).forEach(ID => {
        const bolusValue = bolusSettings[ID];
        console.log(`${ID}: ${bolusValue}`);
        });
        console.log('App Settings');
        console.log('---------------------------------------------');
        const appSettings = storage.settings.app;
        Object.keys(appSettings).forEach(ID => {
        const settingsValue = appSettings[ID];
        console.log(`${ID}: ${settingsValue}`);
        });
        console.log('---------------------------------------------');
    }
}

//==========================================================================

//Settings Page
//Elements
//========================================================================================================

const bolusValues = {}

const KE_0000_InputElement = document.getElementById("settingsInput0000")
const KE_0100_InputElement = document.getElementById("settingsInput0100")
const KE_0200_InputElement = document.getElementById("settingsInput0200")
const KE_0300_InputElement = document.getElementById("settingsInput0300")
const KE_0400_InputElement = document.getElementById("settingsInput0400")
const KE_0500_InputElement = document.getElementById("settingsInput0500")
const KE_0600_InputElement = document.getElementById("settingsInput0600")
const KE_0700_InputElement = document.getElementById("settingsInput0700")
const KE_0800_InputElement = document.getElementById("settingsInput0800")
const KE_0900_InputElement = document.getElementById("settingsInput0900")
const KE_1000_InputElement = document.getElementById("settingsInput1000")
const KE_1100_InputElement = document.getElementById("settingsInput1100")
const KE_1200_InputElement = document.getElementById("settingsInput1200")
const KE_1300_InputElement = document.getElementById("settingsInput1300")
const KE_1400_InputElement = document.getElementById("settingsInput1400")
const KE_1500_InputElement = document.getElementById("settingsInput1500")
const KE_1600_InputElement = document.getElementById("settingsInput1600")
const KE_1700_InputElement = document.getElementById("settingsInput1700")
const KE_1800_InputElement = document.getElementById("settingsInput1800")
const KE_1900_InputElement = document.getElementById("settingsInput1900")
const KE_2000_InputElement = document.getElementById("settingsInput2000")
const KE_2100_InputElement = document.getElementById("settingsInput2100")
const KE_2200_InputElement = document.getElementById("settingsInput2200")
const KE_2300_InputElement = document.getElementById("settingsInput2300")




//KE_0000_FACTOR: KE_0000_InputElement.value.replace(/,/g, '.'),


//========================================================================================================
function showPopup(popupID) {
    let background = document.getElementById("popup_background");
    let popup = document.getElementById(popupID);
    background.style.display = "block"
    popup.style.display = "block"
}

function closePopup(popupID) {
    let background = document.getElementById("popup_background");
    let popup = document.getElementById(popupID);
    background.style.display = "none"
    popup.style.display = "none"
}

function nav_bolusSettings() {
    window.location.href = "bolusSettings.html"
}

function nav_settings() {
    window.location.href = "settings.html"
}

function nav_home() {
    window.location.href = "index.html"
}
//========================================================================================================



async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
      const selectedFile = fileInput.files[0];
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = function (event) {
          const fileContent = event.target.result;
          try {
            const jsonData = JSON.parse(fileContent);
            console.log('Daten aus der Datei erfolgreich importiert:', jsonData);
          } catch (error) {
            console.error('Fehler beim Parsen der JSON-Daten:', error);
          }
        };
        reader.readAsText(selectedFile);
      } else {
        console.error('Keine Datei ausgewählt.');
      }
}