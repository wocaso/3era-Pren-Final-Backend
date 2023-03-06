const socket = io();

//-------------------------------------------------------------------------------------------------------//
function searchLastId(array) {
  let i = 0;
  let lastId = 0;
  while (i < array.length) {
    lastId = array[i].id;
    i++;
  }
  return lastId + 1;
}
let newId = 0;
//-------------------------------------------------------------------------------------------------------//
socket.on("messages", (data) => {
  newId = searchLastId(data);

  const html = data
    .map((msj) => {
      return `<div>
        <strong style="color:blue;">${msj.author.nombre} :</strong>
        <span style="color:brown;">${msj.author.email}</span>   
        <em style="color:green;">${msj.text}</em>
        </div>`;
    })
    .join(" ");
  document.getElementById("messages").innerHTML = html;
});

socket.on("products", (data) => {
  const html = data
    .map((element) => {
      return `
        <tr>
        <td>${element.tittle}</td>
        <td>${element.price}</td>
        <td><img src="${element.thumbnail}" style="height: 40px;"/></td>    
      </tr>`;
    })
    .join(" ");
  document.querySelector("#tablaProductos").innerHTML = html;
});

//-------------------------------------------------------------------------------------------------------//

function addMessage() {
  const message = {
    author: {
      email: document.getElementById("email").value,
      nombre: document.getElementById("nombre").value,
      apellido: document.getElementById("apellido").value,
      edad: document.getElementById("edad").value,
      alias: document.getElementById("alias").value,
      avatar: document.getElementById("avatar").value,
    },
    text: document.getElementById("text").value,
    id: newId,
  };
  if (message.author.nombre != "" && message.text != "") {
    socket.emit("new-message", message);
    return false;
  }
  return false;
}

function addProduct() {
  const producto = {
    tittle: document.querySelector("#tittleInput").value,
    price: document.querySelector("#priceInput").value,
    thumbnail: document.querySelector("#thumbnailInput").value,
  };
  if (
    producto.tittle != "" &&
    producto.price != "" &&
    producto.thumbnail != ""
  ) {
    socket.emit("new-producto", producto);
    return false;
  }
  if (producto.tittle === "") {
    alert("Falto ingresar el nombre del producto");
    return false;
  }
  if (producto.price === "") {
    alert("Falto ingresar el precio del producto");
    return false;
  }
  if (producto.thumbnail === "") {
    alert("Falto ingresar el url de la imagen del producto");
    return false;
  }
  return false;
}

//-------------------------------------------------------------------------------------------------------//
//-------------------------------------------------------------------------------------------------------//
