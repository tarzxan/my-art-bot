const REPLICATE_API_TOKEN = 'r8_JgsNAJuVvWV1JDh90LziKuze13N3Anc36Tdap';
const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
let signer, address;

const contractAddress = '0xcc0aCe3b131E6a26bc16a34EF0277BDAbB24e9c9';
const abi = [{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"payForAccess","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_paymentReceiver","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"hasAccess","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"hasNFT","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nftContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PAYMENT_AMOUNT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"paymentReceiver","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"tokenContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}];
const contract = new ethers.Contract(contractAddress, abi, signer);
const tokenAddress = '0x92AF6F53fEbd6B4C6F5293840B6076A1B82c4BC2';
const tokenAbi = ['function approve(address spender, uint256 amount) external returns (bool)'];

document.getElementById('connect').addEventListener('click', async () => {
    try {
        await ethersProvider.send("eth_requestAccounts", []);
        signer = ethersProvider.getSigner();
        address = await signer.getAddress();
        const hasAccess = await contract.hasAccess(address);
        if (hasAccess) {
            document.getElementById('status').innerText = 'Access granted via NFT';
            document.getElementById('generator').style.display = 'block';
        } else {
            document.getElementById('status').innerText = 'No NFT. Pay to proceed.';
            document.getElementById('pay').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('status').innerText = 'Connection failed: ' + error.message;
    }
});

document.getElementById('pay').addEventListener('click', async () => {
    const token = new ethers.Contract(tokenAddress, tokenAbi, signer);
    const amount = ethers.utils.parseUnits('100', 18);
    await token.approve(contractAddress, amount);
    const tx = await contract.payForAccess(address);
    await tx.wait();
    document.getElementById('status').innerText = 'Payment successful. Access granted.';
    document.getElementById('generator').style.display = 'block';
});

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
