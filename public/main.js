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
