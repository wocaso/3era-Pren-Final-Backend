const socket = io()

socket.on("productsFaker",data=>{
    const html = data.map(element =>{
        return `<tr>
        <td>${element.tittle}</td>
        <td>${element.price}</td>
        <td><img src="${element.thumbnail}" style="height: 40px;"/></td>    
      </tr>`
    })
    .join(" ")
    document.querySelector("#tablaProductos").innerHTML = html;
}) 