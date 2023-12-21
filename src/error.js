const modal = document.getElementById("error");
const xCloseButton = document.getElementById("x-close");
const errTitle = document.getElementById("errTitle");
const errBody = document.getElementById("errBody");
const closeButton = document.getElementById("closeButton");

// Function to display the error modal
export const throwError = (title, body) => {
    errTitle.textContent = title;
    errBody.textContent = body;
    modal.style.display = "flex";
}

// Function to hide the error modal
const hideError = () => {
    modal.style.display = "none";
}

// Event listeners to close the modal
xCloseButton.addEventListener("click", hideError);
closeButton.addEventListener("click", hideError);
