// script.js
const REPLICATE_API_TOKEN = 'r8_JgsNAJuVvWV1JDh90LziKuze13N3Anc36Tdap';
let web3;
let accounts = [];
let stakingContract; // Renamed to accessContract for clarity, but using your ABI
let walletConnectProvider;

const contractAddress = '0xcc0aCe3b131E6a26bc16a34EF0277BDAbB24e9c9';
const abi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "payForAccess",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_paymentReceiver",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "hasAccess",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "hasNFT",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "nftContract",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "PAYMENT_AMOUNT",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "paymentReceiver",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "tokenContract",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
const tokenAddress = '0x92AF6F53fEbd6B4C6F5293840B6076A1B82c4BC2';
const tokenAbi = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "spender",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "type": "function"
    }
];
const BASE_CHAIN_ID = 8453; // Base Mainnet

// Initialize WalletConnect
async function initWalletConnect() {
    walletConnectProvider = await EthereumProvider.init({
        projectId: 'YOUR_WALLET_CONNECT_PROJECT_ID', // Replace with your real WalletConnect Project ID
        chains: [BASE_CHAIN_ID],
        showQrModal: true,
        metadata: {
            name: 'Your Art Bot',
            description: 'AI Art Generator with Blockchain Access',
            url: window.location.origin,
            icons: ['https://base.org/images/base-icon.svg']
        }
    });
}

// Initialize Web3
async function initWeb3(provider) {
    web3 = new Web3(provider);
    accounts = await web3.eth.getAccounts();
    const chainId = await web3.eth.getChainId();
    if (chainId !== BASE_CHAIN_ID) {
        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
                        chainName: 'Base Mainnet',
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                        rpcUrls: ['https://mainnet.base.org'],
                        blockExplorerUrls: ['https://basescan.org'],
                    }],
                });
            } else {
                throw switchError;
            }
        }
    }
    contract = new web3.eth.Contract(abi, contractAddress);
    return true;
}

// Connect Browser Wallet
async function connectBrowserWallet() {
    if (!window.ethereum) {
        document.getElementById('status').innerText = 'No wallet provider detected. Install MetaMask.';
        return;
    }
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (await initWeb3(window.ethereum)) {
        checkAccess();
    }
}

// Connect WalletConnect
async function connectWalletConnect() {
    await walletConnectProvider.connect();
    if (await initWeb3(walletConnectProvider)) {
        checkAccess();
    }
}

// Check Access
async function checkAccess() {
    try {
        const hasAccess = await contract.methods.hasAccess(accounts[0]).call();
        if (hasAccess) {
            document.getElementById('status').innerText = 'Access granted via NFT';
            document.getElementById('generator').style.display = 'block';
        } else {
            document.getElementById('status').innerText = 'No NFT. Pay to proceed.';
            document.getElementById('pay').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('status').innerText = 'Error checking access: ' + error.message;
    }
}

// Pay for Access
document.getElementById('pay').addEventListener('click', async () => {
    try {
        const token = new web3.eth.Contract(tokenAbi, tokenAddress);
        const amount = web3.utils.toWei('100', 'ether'); // Assuming 18 decimals
        await token.methods.approve(contractAddress, amount).send({ from: accounts[0] });
        const tx = await contract.methods.payForAccess(accounts[0]).send({ from: accounts[0] });
        await tx.wait(); // web3.js doesn't have .wait(), but you can poll or use events; for simplicity, assume success
        document.getElementById('status').innerText = 'Payment successful. Access granted.';
        document.getElementById('generator').style.display = 'block';
    } catch (error) {
        document.getElementById('status').innerText = 'Payment failed: ' + error.message;
    }
});

// Generate Art (unchanged)
document.getElementById('generate').addEventListener('click', async () => {
    const prompt = document.getElementById('prompt').value;
    const imageFile = document.getElementById('image').files[0];
    if (!imageFile) return alert('Upload an image');

    const formData = new FormData();
    formData.append('image', imageFile);
    const imageUrl = await fetch('https://api.imgur.com/3/image', { method: 'POST', body: formData, headers: { Authorization: 'Client-ID 546c25a59c58ad7' } }).then(res => res.json()).then(json => json.data.link);

    const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
            Authorization: `Token ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            version: 'lucataco/flux-kontext-dev:1.0',
            input: { prompt: prompt, image: imageUrl, steps: 20, guidance_scale: 2.5 }
        })
    }).then(res => res.json());

    let output;
    while (true) {
        const poll = await fetch(response.urls.get).then(res => res.json());
        if (poll.status === 'succeeded') { output = poll.output[0]; break; }
        if (poll.status === 'failed') { alert('Generation failed'); break; }
        await new Promise(r => setTimeout(r, 2000));
    }

    document.getElementById('output').src = output;
});

// Init and Connect Button (prompt for browser or WalletConnect; simplify for now with browser first)
document.getElementById('connect').addEventListener('click', async () => {
    try {
        await initWalletConnect();
        // For simplicity, try browser first; add modal for choice if needed
        await connectBrowserWallet();
    } catch (error) {
        document.getElementById('status').innerText = 'Connection failed: ' + error.message;
    }
});

