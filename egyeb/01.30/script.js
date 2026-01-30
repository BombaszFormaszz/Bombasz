console.log("1.");
console.log("2.");

function Fv1() {
    console.log("3.");
    for (let i = 0; i < 100; i++) {
        console.log("hello");

    }
}

setTimeout(() => {
    console.log("4.");
}, 0);

Fv1(); 

console.log("1.");

function fv2(){
    console.log("2.");
}
setTimeout(() => {
    console.log("3.");
}, 2000);

function fv3(){
    setTimeout(() => {
        console.log("4.");
    }, 1000);
}

fv3();
fv2();

//1, 2, 4, 3