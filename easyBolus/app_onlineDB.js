
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js"
import { getDatabase, ref, query, get, orderByChild, push, onValue, remove} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js"

//Elements
//========================================================================================================

//Content Container
const contentContainerElement = document.getElementById("contentContainer")
const popupItemContentElement = document.getElementById("popup-item-content")
const searchBarContainer = document.getElementById("searchBarContainer")

//Inputs
const nameInputElement = document.getElementById("name-add-input")
const khInputElement = document.getElementById("kh-add-input")
const amountInputElement = document.getElementById("amount-add-input")
const unitSelectElement = document.getElementById("unit-add-select")
const searchInput = document.getElementById("searchInput")


//Main Add Button
const addButtonElement = document.getElementById("add_button")
addButtonElement.addEventListener("click", function() {
    showPopup("popup_add")
    nameInputElement.focus()
})

//Search Close Button
const searchBarClose = document.getElementById("searchBarClose")
searchBarClose.addEventListener("click", function() {
    showSearchBar(false)
})

//Search Button
const searchButtonElement = document.getElementById("searchButton")
searchButtonElement.addEventListener("click", function() {
    if (searchBarContainer.style.display == "flex") {
        showSearchBar(false)
    } else {
        showSearchBar(true)
    }
})

//Close Search Bar
function showSearchBar(visible) {
    if (visible){
        searchBarContainer.style.display = "flex"
        searchInput.focus()
    } else {
        searchBarContainer.style.display = "none"
        searchInput.value = ""
        getProducts()
    }
}

searchInput.addEventListener("keyup", function() {
    getProducts()
})


//Add Popup -> Confirm Button
const confirmAddButtonElement = document.getElementById("confirm-add-button")
confirmAddButtonElement.addEventListener("click", function() {
    let name = nameInputElement.value
    let kh = khInputElement.value.replace(/,/g, '.')
    let amount = amountInputElement.value.replace(/,/g, '.')
    let unit = unitSelectElement.value
    
    let jsonString = {NAME:name, AMOUNT:amount, KH:kh, UNIT:unit}
    clearInput()
    push(productListInDB, jsonString)
    closePopup("popup_add")
})
function clearInput(){
    nameInputElement.value = ""
    khInputElement.value = ""
    amountInputElement.value = ""
    unitSelectElement.value = "g"
}

//Add Popup -> Abort Button
const abortAddButtonElement = document.getElementById("abort-add-button")
abortAddButtonElement.addEventListener("click", function() {
    clearInput()
    closePopup("popup_add")
})

//Item Popup -> Title
const popupItemTitleElement = document.getElementById("popup-item-title")

//Item Popup -> Abort Button
const abortItemButtonElement = document.getElementById("abort-item-button")
abortItemButtonElement.addEventListener("click", function() {
    closePopup("popup_item")
})

//Item Popup -> Delete Button
const deleteItemButtonElement = document.getElementById("delete-item-button")
deleteItemButtonElement.addEventListener("click", function() {
            let exactLocationOfItemInDB = ref(database, `productList/${deleteItemButtonElement.name}`)
            remove(exactLocationOfItemInDB)
            closePopup("popup_item")
})
//========================================================================================================


//Datenbank
//========================================================================================================
const appSettings = {databaseURL: "https://easybolus-default-rtdb.europe-west1.firebasedatabase.app/"}
const database = getDatabase(initializeApp(appSettings))
const productListInDB = ref(database, "productList")
const productListInDBQuery = query(ref(database, "productList"), orderByChild("NAME"))

//Lade Produkt-Daten aus der Datenbank
onValue(productListInDB, function(snapshot) {   
    if (snapshot.exists()) {
        getProducts()
    } else {
        contentContainerElement.innerHTML = `<h1>No Items!</h1>`
    }
})

function getProducts(){
    contentContainerElement.innerHTML = ""
    get(productListInDBQuery).then((snapshot)=>{
        snapshot.forEach(snapshotChild => {
            let data = [snapshotChild.key,snapshotChild.val()]
            let name = (data[1].NAME).toUpperCase()
            if (searchInput.value != "") {
                if (name.includes(searchInput.value.toUpperCase())) {
                    appendItemToContentContainerstEl(data)
                }
            } else {
                appendItemToContentContainerstEl(data)
            }
        })
    })
}


//Füge die Daten der Anzeige hinzu
function appendItemToContentContainerstEl(product) {
    let productID = product[0]

    let productProperties = product[1]

    let name = productProperties.NAME
    let kh = productProperties.KH
    let amount = productProperties.AMOUNT
    let unit = productProperties.UNIT
    let khPerAmount = Math.round(amount/100*kh)
    let factor = parseFloat(checkBolusFactor())
    let bolus = Math.round(khPerAmount/10*factor)


    let newElement = document.createElement("div")
    newElement.classList.add("product-panel");
    newElement.innerHTML = `<span class="dot"></span><div><h1>${name}</h1><p>KH: ${kh} g pro 100 ${unit} | Portion: ${amount} ${unit}</p></div>`
    //newElement.innerHTML = `<img class="small-img" src="img/food.svg"><div><h1>${name}</h1><p>KH: ${kh} g pro 100 ${unit} | Portion: ${amount} ${unit}</p></div>`
    newElement.addEventListener("click", function() {
        
        console.info(factor)

        deleteItemButtonElement.name = productID
        
        popupItemTitleElement.innerHTML = name

        popupItemContentElement.innerHTML = `
        <p class="popup-item-infotext">KH: ${kh} g pro 100 ${unit}</p>
        <p class="popup-item-infotext">Portion: ${amount} ${unit}</p>
        <p class="popup-item-infotext1">${khPerAmount} g KH pro Portion</p>
        <p class="popup-item-infotext2"><img class="small-img" src="img/syringe.svg">  ${bolus} IE</p>`
        
        showPopup("popup_item")
    })
    contentContainerElement.append(newElement)
}
//========================================================================================================


function checkBolusFactor(){
    let bolusFactor = 0
    const jetzt = new Date();
    let stunde = jetzt.getHours();
    // Führende Null hinzufügen, wenn die Stunde einstellig ist
    stunde = stunde < 10 ? '0' + stunde : stunde;

    let storageKey = "KE_" + stunde + "00_FACTOR"

    bolusFactor = localStorage.getItem(storageKey)
    if (bolusFactor != null) {bolusFactor.replace('"','').replace('"','')}
    return bolusFactor;
}


//Popups and Navigation
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

function nav_settings() {
    window.location.href = "settings.html"
}

function nav_home() {
    window.location.href = "index.html"
}
//========================================================================================================