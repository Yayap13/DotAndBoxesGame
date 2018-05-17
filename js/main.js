"use strict";

var NebPay = require("nebpay");
var nebPay = new NebPay();    
var serialNumber; //transaction serial number
var intervalQuery; //periodically query tx results


// Global variables used by our Dapp
var contract_address = "n1xUkWthFcpNDBHHzCZRLkJV87nobhwuhZB";

// Called by the post button
function onCreateTransaction() {
	$("#createTransaction").prop("disabled", true)
	
	var to = contract_address;   //the smart contract address of your Dapp
	var value = (Number($("#createTransaction-amount").val().split(",").join("."))).toString();
	var callFunction = "createTransaction" //the function name to be called
	var callArgs =  JSON.stringify([$("#createTransaction-address").val()])  //the parameter, it's format JSON string of parameter arrays, such as'["arg"]','["arg1","arg2]'        
	var options = {
		callback: "https://pay.nebulas.io/api/mainnet/pay"
	}

	//Send transaction (here is smart contract call)
	serialNumber = nebPay.call(to, value, callFunction, callArgs, options);
}

function onConfirmSending() {
	$("#confirmSending").prop("disabled", true)

	var to = contract_address;   //the smart contract address of your Dapp
	var value = "0";
	var callFunction = "confirmSending" //the function name to be called
	var callArgs =  ""  //the parameter, it's format JSON string of parameter arrays, such as'["arg"]','["arg1","arg2]'        
	var options = {
		callback: "https://pay.nebulas.io/api/mainnet/pay"
	}

	//Send transaction (here is smart contract call)
	serialNumber = nebPay.call(to, value, callFunction, callArgs, options);
}

function onConfirmReceiving() {
	$("#confirmReceiving").prop("disabled", true)
	
	var to = contract_address;   //the smart contract address of your Dapp
	var value = "0";
	var callFunction = "confirmReceiving" //the function name to be called
	var callArgs =  ""  //the parameter, it's format JSON string of parameter arrays, such as'["arg"]','["arg1","arg2]'        
	var options = {
		callback: "https://pay.nebulas.io/api/mainnet/pay"
	}

	//Send transaction (here is smart contract call)
	serialNumber = nebPay.call(to, value, callFunction, callArgs, options);
}

var showConsumer = true;

//initiate the transaction with a button click, here is an example of calling a smart contract
function refreshData() {
	$("#refresh").addClass("rotate");    
	var to = contract_address;
	var value = "";
	var callFunction = "getAddressInfo";
	var callArgs = "";
	nebPay.simulateCall(to, value, callFunction, callArgs, {
		qrcode: {
			showQRCode: false
		},
		listener: updateFront,  //set listener for extension transaction result
		callback: "https://pay.nebulas.io/api/mainnet/pay"
	});
}

function updateFront(resp) {
	var data = JSON.parse(JSON.parse(resp.result));
	console.log("data: " + JSON.stringify(data));

	if(showConsumer) {
		$(".supplier").hide();
		$(".consumer").show();
	} else {
		$(".consumer").hide();
		$(".supplier").show();
	}
	
	if(data.isAlreadyTransacting == false) {
		$(".step-1").show();
		$(".step-2").hide();
		$(".step-3").hide();
		$(".step-wrong").hide();
	} else if(data.step == 1) {
		$("#transactionInformation").text((Number(data.value)/1000000000000000000)+" NAS");
		$(".step-1").hide();
		$(".step-2").show();
		$(".step-3").hide();
		$(".step-wrong").hide();
		checkAlreadyTransacting(data)
	} else if(data.step == 2) {
		$(".step-1").hide();
		$(".step-2").hide();
		$(".step-3").show();
		$(".step-wrong").hide();
		checkAlreadyTransacting(data)
	}
	$("#refresh").removeClass("rotate");
}

function checkAlreadyTransacting(data) {
	if((showConsumer && data.isSeller) || (!showConsumer && data.isBuyer)) {
		$(".youAre").text((data.isBuyer) ? "Buyer" : "Seller");
		$(".step-1").hide();
		$(".step-2").hide();
		$(".step-3").hide();
		$(".step-wrong").show();
	}
}

refreshData();
setInterval(function() {
	refreshData();
}, 5000);

/* Toggle switch */

$(".switch-label-on").click(function(e) {
	$(".consumer").hide();
	$(".supplier").show();
	showConsumer = false;
	refreshData();
});
$(".switch-label-off").click(function(e) {
	$(".supplier").hide();
	$(".consumer").show();
	showConsumer = true;
	refreshData();
});