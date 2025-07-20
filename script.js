// Ensure you have a valid WalletConnect Project ID from https://cloud.walletconnect.com
const REPLICATE_API_TOKEN = 'r8_JgsNAJuVvWV1JDh90LziKuze13N3Anc36Tdap'; // Move to backend for security
let web3;
let accounts = [];
let contract; // Consistent variable name
let walletConnectProvider;

const contractAddress = '0xcc0aCe3b131E6a26bc16a34EF0277BDAbB24e9c9';
const abi = [ /* Your provided ABI, unchanged */ ];
const tokenAddress = '0x92AF6F53fEbd6B4C6F5293840B6076A1B82c4BC2';
const tokenAbi = [ /* Your provided token ABI, unchanged */ ];
const BASE_CHAIN_ID = 8453; // Base Mainnet

// Initialize WalletConnect
async function initWalletConnect() {
    try {
        // Use window.EthereumProvider from CDN
        walletConnectProvider = await window.EthereumProvider.init({
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
    } catch (error) {
        throw new Error('WalletConnect initialization failed: ' + error.message);
    }
}

// Initialize Web3
async function initWeb3(provider) {
    try {
        web3 = new Web3(provider);
        accounts = await web3.eth.getAccounts();
        if (!accounts.length) throw new Error('No accounts found');
        
        const chainId = await web3.eth.getChainId();
        if (Number(chainId) !== BASE_CHAIN_ID) {
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
    } catch (error) {
        throw new Error('Web3 initialization failed: ' + error.message);
    }
}

// Connect Browser Wallet
async function connectBrowserWallet() {
    try {
        if (!window.ethereum) {
            document.getElementById('status').innerText = 'No wallet provider detected. Install MetaMask.';
            return;
        }
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (await initWeb3(window.ethereum)) {
            await checkAccess();
        }
    } catch (error) {
        document.getElementById('status').innerText = 'Browser wallet connection failed: ' + error.message;
    }
}

// Connect WalletConnect
async function connectWalletConnect() {
    try {
        await walletConnectProvider.connect();
        if (await initWeb3(walletConnectProvider)) {
            await checkAccess();
        }
    } catch (error) {
        document.getElementById('status').innerText = 'WalletConnect connection failed: ' + error.message;
    }
}

// Check Access
async function checkAccess() {
    try {
        document.getElementById('status').innerText = 'Checking access...';
        const hasAccess = await contract.methods.hasAccess(accounts[0]).call();
        if (hasAccess) {
            document.getElementById('status').innerText = 'Access granted via NFT';
            document.getElementById('generator').style.display = 'block';
            document.getElementById('pay').style.display = 'none';
        } else {
            document.getElementById('status').innerText = 'No NFT. Pay to proceed.';
            document.getElementById('pay').style.display = 'block';
            document.getElementById('generator').style.display = 'none';
        }
    } catch (error) {
        document.getElementById('status').innerText = 'Error checking access: ' + error.message;
    }
}

// Pay for Access
document.getElementById('pay').addEventListener('click', async () => {
    try {
        document.getElementById('status').innerText = 'Processing payment...';
        const token = new web3.eth.Contract(tokenAbi, tokenAddress);
        // Verify token decimals (assuming 18 for BIRDDOG; adjust if different)
        const amount = web3.utils.toWei('100', 'ether'); // Confirm decimals with token contract
        await token.methods.approve(contractAddress, amount).send({ from: accounts[0] });
        await contract.methods.payForAccess(accounts[0]).send({ from: accounts[0] });
        // Poll for transaction confirmation (Web3.js doesn't have .wait())
        document.getElementById('status').innerText = 'Payment successful. Access granted.';
        document.getElementById('generator').style.display = 'block';
        document.getElementById('pay').style.display = 'none';
    } catch (error) {
        document.getElementById('status').innerText = 'Payment failed: ' + error.message;
    }
});

// Generate Art
document.getElementById('generate').addEventListener('click', async () => {
    try {
        document.getElementById('status').innerText = 'Generating art...';
        const prompt = document.getElementById('prompt').value;
        const imageFile = document.getElementById('image').files[0];
        if (!imageFile) {
            document.getElementById('status').innerText = 'Please upload an image';
            return;
        }

        const formData = new FormData();
        formData.append('image', imageFile);
        const imageResponse = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            body: formData,
            headers: { Authorization: 'Client-ID 546c25a59c58ad7' } // Move to backend
        }).then(res => res.json());
        if (!imageResponse.success) throw new Error('Image upload failed');

        const imageUrl = imageResponse.data.link;
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                Authorization: `Token ${REPLICATE_API_TOKEN}`, // Move to backend
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: 'lucataco/flux-kontext-dev:1.0', // Verify correct version
                input: { prompt: prompt, image: imageUrl, steps: 20, guidance_scale: 2.5 }
            })
        }).then(res => res.json());

        if (!response.urls?.get) throw new Error('Invalid Replicate API response');

        let output;
        while (true) {
            const poll = await fetch(response.urls.get).then(res => res.json());
            if (poll.status === 'succeeded') {
                output = poll.output[0];
                break;
            }
            if (poll.status === 'failed') {
                throw new Error('Art generation failed');
            }
            await new Promise(r => setTimeout(r, 2000));
        }

        document.getElementById('output').src = output;
        document.getElementById('status').innerText = 'Art generated successfully!';
    } catch (error) {
        document.getElementById('status').innerText = 'Art generation failed: ' + error.message;
    }
});

// Initialize and Connect
document.getElementById('connect').addEventListener('click', async () => {
    try {
        document.getElementById('status').innerText = 'Connecting...';
        await initWalletConnect();
        // Prompt user to choose wallet (simplified to browser for now)
        await connectBrowserWallet();
    } catch (error) {
        document.getElementById('status').innerText = 'Connection failed: ' + error.message;
    }
});
