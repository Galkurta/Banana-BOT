const axios = require('axios');
const colors = require('colors');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { DateTime, Duration } = require('luxon');
const readline = require('readline');
const emoji = require('node-emoji');
class BananaBot {
    constructor() {
        this.base_url = 'https://interface.carv.io/banana';
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://banana.carv.io',
            'Referer': 'https://banana.carv.io/',
            'Sec-CH-UA': '"Not A;Brand";v="99", "Android";v="12"',
            'Sec-CH-UA-Mobile': '?1',
            'Sec-CH-UA-Platform': '"Android"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 4 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.73 Mobile Safari/537.36',
            'X-App-ID': 'carv',
        };        
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async login(queryId) {
        const loginPayload = {
            tgInfo: queryId,
            InviteCode: "O2K2VE6"
        };

        try {
            const response = await axios.post(`${this.base_url}/login`, loginPayload, { headers: this.headers });
            await this.sleep(1000);

            const responseData = response.data;
            if (responseData.data && responseData.data.token) {
                return responseData.data.token;
            } else {
                this.log('No token found.');
                return null;
            }
        } catch (error) {
            this.log('Error in login process: ' + error.message);
            return null;
        }
    }

    async achieveQuest(questId) {
        const achievePayload = { quest_id: questId };
        try {
            return await axios.post(`${this.base_url}/achieve_quest`, achievePayload, { headers: this.headers });
        } catch (error) {
            this.log('Error when on duty: ' + error.message);
        }
    }

    async claimQuest(questId) {
        const claimPayload = { quest_id: questId };
        try {
            return await axios.post(`${this.base_url}/claim_quest`, claimPayload, { headers: this.headers });
        } catch (error) {
            this.log('Error when Claim Mandline: ' + error.message);
        }
    }

    async doClick(clickCount) {
        const clickPayload = { clickCount: clickCount };
        try {
            const response = await axios.post(`${this.base_url}/do_click`, clickPayload, { headers: this.headers });
            return response.data;
        } catch (error) {
            this.log('Error when tap: ' + error.message);
            return null;
        }
    }

    async getLotteryInfo() {
        try {
            return await axios.get(`${this.base_url}/get_lottery_info`, { headers: this.headers });
        } catch (error) {
            this.log('Error when taking information: ' + error.message);
        }
    }

    async claimLottery() {
        const claimPayload = { claimLotteryType: 1 };
        try {
            return await axios.post(`${this.base_url}/claim_lottery`, claimPayload, { headers: this.headers });
        } catch (error) {
            this.log('Error cannot Harvest: ' + error.message);
        }
    }

    async doLottery() {
        try {
            return await axios.post(`${this.base_url}/do_lottery`, {}, { headers: this.headers });
        } catch (error) {
            this.log('Error when claim tap: ' + error.message);
        }
    }

    calculateRemainingTime(lotteryData) {
        const lastCountdownStartTime = lotteryData.last_countdown_start_time || 0;
        const countdownInterval = lotteryData.countdown_interval || 0;
        const countdownEnd = lotteryData.countdown_end || false;

        if (!countdownEnd) {
            const currentTime = DateTime.now();
            const lastCountdownStart = DateTime.fromMillis(lastCountdownStartTime);
            const elapsedTime = currentTime.diff(lastCountdownStart, 'minutes').as('minutes');
            const remainingTimeMinutes = Math.max(countdownInterval - elapsedTime, 0); 
            return remainingTimeMinutes;
        }
        return 0;
    }

    askUserChoice(prompt) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(prompt, (answer) => {
                rl.close();
                resolve(answer.trim().toLowerCase() === 'yes');
            });
        });
    }

    async equipBestBanana(currentEquipBananaId) {
        try {
            const response = await axios.get(`${this.base_url}/get_banana_list`, { headers: this.headers });
            const bananas = response.data.data.banana_list;
    
            const eligibleBananas = bananas.filter(banana => banana.count >= 1);
            if (eligibleBananas.length > 0) {
                const bestBanana = eligibleBananas.reduce((prev, current) => {
                    return (prev.daily_peel_limit > current.daily_peel_limit) ? prev : current;
                });
    
                if (bestBanana.banana_id === currentEquipBananaId) {
                    this.log(colors.green(`The best banana is using: ${colors.yellow(bestBanana.name)} | Price : ${colors.yellow(bestBanana.sell_exchange_peel)} Peels / ${colors.yellow(bestBanana.sell_exchange_usdt)} USDT.`));
                    
                    if (bestBanana.sell_exchange_usdt >= 1) {
                        this.log(colors.red(`Having reached the goal! USDT value of bananas: ${colors.yellow(bestBanana.sell_exchange_usdt)} USDT`));
                        process.exit(0);
                    }
                    
                    return;
                }
    
                const equipPayload = { bananaId: bestBanana.banana_id };
                const equipResponse = await axios.post(`${this.base_url}/do_equip`, equipPayload, { headers: this.headers });
                if (equipResponse.data.code === 0) {
                    this.log(colors.green(`The best banana Equip: ${colors.yellow(bestBanana.name)} with ${bestBanana.daily_peel_limit} ${emoji.get('banana')} / DAY`));
                } else {
                    this.log(colors.red('Using bananas failed!'));
                }
            } else {
                this.log(colors.red('No bananas are found!'));
            }
        } catch (error) {
            this.log('Error:' + error.message);
        }
    }
	
    askQuestion(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }));
    }

    async doSpeedup(maxSpeedups = 3) {
        let speedupsPerformed = 0;
        while (speedupsPerformed < maxSpeedups) {
            try {
                const response = await axios.post(`${this.base_url}/do_speedup`, {}, { headers: this.headers });
                if (response.data.code === 0) {
                    const speedupCount = response.data.data.speedup_count;
                    const lotteryInfo = response.data.data.lottery_info;
                    speedupsPerformed++;
                    this.log(colors.green(`Speedup successful! Remaining ${speedupCount} Speedup. Made ${speedupsPerformed}/${maxSpeedups} time.`));
    
                    if (lotteryInfo.countdown_end === true) {
                        this.log(colors.yellow('Countdown ends.Claim Lottery ...'));
                        await this.claimLottery();
                    }
    
                    if (speedupCount === 0 || speedupsPerformed >= maxSpeedups) {
                        this.log(colors.yellow(`Out of speedup or limit has been reached ${maxSpeedups} time.`));
                        return lotteryInfo;
                    }
                } else {
                    this.log(colors.red('Speedup failed!'));
                    return null;
                }
            } catch (error) {
                this.log('Error when doing Speedup:' + error.message);
                return null;
            }
        }
    }

    async processAccount(queryId, isFirstAccount = false, doQuests) {
        let remainingTimeMinutes = Infinity;
        const token = await this.login(queryId);
        if (token) {
            this.headers['Authorization'] = token;
            this.headers['Cache-Control'] = 'no-cache';
            this.headers['Pragma'] = 'no-cache';
    
            try {
                const userInfoResponse = await axios.get(`${this.base_url}/get_user_info`, { headers: this.headers });
                this.log(colors.green('Logged in successfully !'));
                await this.sleep(1000);
                const userInfoData = userInfoResponse.data;
    
                const userInfo = userInfoData.data || {};
                const peel = userInfo.peel || 'N/A';
                const usdt = userInfo.usdt || 'N/A';
                const todayClickCount = userInfo.today_click_count || 0;
                const maxClickCount = userInfo.max_click_count || 0;
                const currentEquipBananaId = userInfo.equip_banana_id || 0;
                const speedup = userInfo.speedup_count || 0;
    
                this.log(colors.green(`Balance   : ${colors.white(peel)}`));
                this.log(colors.green(`USDT      : ${colors.white(usdt)}`));
                this.log(colors.green(`Speed Up  : ${colors.white(speedup)}`));
                this.log(colors.green(`Today tap : ${colors.white(todayClickCount)} time`));
    
                await this.equipBestBanana(currentEquipBananaId);
    
                try {
                    const lotteryInfoResponse = await this.getLotteryInfo();
                    await this.sleep(1000);
                    const lotteryInfoData = lotteryInfoResponse.data;
                    let remainLotteryCount = (lotteryInfoData.data || {}).remain_lottery_count || 0;
                    remainingTimeMinutes = this.calculateRemainingTime(lotteryInfoData.data || {});
    
                    if (remainingTimeMinutes <= 0) {
                        this.log(colors.yellow('Start Claim ...'));
                        await this.claimLottery();
                        
                        const updatedLotteryInfoResponse = await this.getLotteryInfo();
                        await this.sleep(1000);
                        const updatedLotteryInfoData = updatedLotteryInfoResponse.data;
                        remainLotteryCount = (updatedLotteryInfoData.data || {}).remain_lottery_count || 0;
                        remainingTimeMinutes = this.calculateRemainingTime(updatedLotteryInfoData.data || {});
                    }
    
                    if (speedup > 0) {
                        const maxSpeedups = speedup > 3 ? 3 : speedup;
                        this.log(colors.yellow(`Maximum speedup ${maxSpeedups} time...`));
                        const speedupLotteryInfo = await this.doSpeedup(maxSpeedups);
                        if (speedupLotteryInfo) {
                            remainingTimeMinutes = this.calculateRemainingTime(speedupLotteryInfo);
                        }
                    }
    
                    const remainingDuration = Duration.fromMillis(remainingTimeMinutes * 60 * 1000);
                    const remainingHours = Math.floor(remainingDuration.as('hours'));
                    const remainingMinutes = Math.floor(remainingDuration.as('minutes')) % 60;
                    const remainingSeconds = Math.floor(remainingDuration.as('seconds')) % 60;
    
                    this.log(colors.yellow(`The remaining time to receive Banana: ${remainingHours} Hour ${remainingMinutes} minute ${remainingSeconds} second`));
    
                    this.log(colors.yellow(`Harvest is available : ${colors.white(remainLotteryCount)}`));
                    if (remainLotteryCount > 0) {
                        this.log('Start Harvest ...');
                        for (let i = 0; i < remainLotteryCount; i++) {
                            this.log(`Harvest's Harvest ${i + 1}/${remainLotteryCount}...`);
                            const doLotteryResponse = await this.doLottery();
    
                            if (doLotteryResponse.status === 200) {
                                const lotteryResult = doLotteryResponse.data.data || {};
                                const bananaName = lotteryResult.name || 'N/A';
                                const sellExchangePeel = lotteryResult.sell_exchange_peel || 'N/A';
                                const sellExchangeUsdt = lotteryResult.sell_exchange_usdt || 'N/A';
    
                                this.log(`Harvest success ${bananaName}`);
                                console.log(colors.yellow(`     - Banana Name : ${bananaName}`));
                                console.log(colors.yellow(`     - Peel Limit : ${lotteryResult.daily_peel_limit || 'N/A'}`));
                                console.log(colors.yellow(`     - Price : ${sellExchangePeel} Peel, ${sellExchangeUsdt} USDT`));
                                await this.sleep(1000);
                            } else {
                                this.log(colors.red(`Unwanted Error when Harvest ${i + 1}.`));
                            }
                        }
                        this.log('Harvest all.');
                    }
                } catch (error) {
                    this.log('Failed get Lottery Info: ' + error.message);
                }
    
                if (todayClickCount < maxClickCount) {
                    const clickCount = maxClickCount - todayClickCount;
                    if (clickCount > 0) {
                        this.log(colors.magenta(`You have ${clickCount} Tap ...`));
                        
                        const parts = [];
                        let remaining = clickCount;
                        for (let i = 0; i < 9; i++) {
                            const part = Math.floor(Math.random() * (remaining / (10 - i))) * 2;
                            parts.push(part);
                            remaining -= part;
                        }
                        parts.push(remaining); 
                        
                        for (const part of parts) {
                            this.log(colors.magenta(`Tap ${part} time...`));
                            const response = await this.doClick(part);
                            if (response && response.code === 0) {
                                const peel = response.data.peel || 0;
                                const speedup = response.data.speedup || 0;
                                this.log(colors.magenta(`Receive ${peel} Peel, ${speedup} Speedup...`));
                            } else {
                                this.log(colors.red(`Error when tap ${part} time.`));
                            }
                            await this.sleep(1000);
                        }
                
                        const userInfoResponse = await axios.get(`${this.base_url}/get_user_info`, { headers: this.headers });
                        const userInfo = userInfoResponse.data.data || {};
                        const updatedSpeedup = userInfo.speedup_count || 0;
                
                        if (updatedSpeedup > 0) {
                            this.log(colors.yellow(`Do Speedup, you have ${updatedSpeedup} time...`));
                            const speedupLotteryInfo = await this.doSpeedup();
                            if (speedupLotteryInfo) {
                                remainingTimeMinutes = this.calculateRemainingTime(speedupLotteryInfo);
                            }
                        }
                
                        const remainingDuration = Duration.fromMillis(remainingTimeMinutes * 60 * 1000);
                        const remainingHours = Math.floor(remainingDuration.as('hours'));
                        const remainingMinutes = Math.floor(remainingDuration.as('minutes')) % 60;
                        const remainingSeconds = Math.floor(remainingDuration.as('seconds')) % 60;
                
                        this.log(colors.yellow(`The remaining time to receive Banana: ${remainingHours} Hour ${remainingMinutes} minute ${remainingSeconds} second`));
                    } else {
                        this.log(colors.red('Can not tap, have reached the maximum limit!'));
                    }
                } else {
                    this.log(colors.red('Can not tap, have reached the maximum limit!'));
                }        
                
                if (doQuests) {
                    try {
                        const questListResponse = await axios.get(`${this.base_url}/get_quest_list`, { headers: this.headers });
                        await this.sleep(1000);
                        const questListData = questListResponse.data;
        
                        const questList = (questListData.data || {}).quest_list || [];
                        for (let i = 0; i < questList.length; i++) {
                            const quest = questList[i];
                            const questName = quest.quest_name || 'N/A';
                            let isAchieved = quest.is_achieved || false;
                            let isClaimed = quest.is_claimed || false;
                            const questId = quest.quest_id;
        
                            if (!isAchieved) {
                                await this.achieveQuest(questId);
                                await this.sleep(1000);
        
                                const updatedQuestListResponse = await axios.get(`${this.base_url}/get_quest_list`, { headers: this.headers });
                                const updatedQuestListData = updatedQuestListResponse.data;
                                const updatedQuest = updatedQuestListData.data.quest_list.find(q => q.quest_id === questId);
                                isAchieved = updatedQuest.is_achieved || false;
                            }
        
                            if (isAchieved && !isClaimed) {
                                await this.claimQuest(questId);
                                await this.sleep(1000);
        
                                const updatedQuestListResponse = await axios.get(`${this.base_url}/get_quest_list`, { headers: this.headers });
                                const updatedQuestListData = updatedQuestListResponse.data;
                                const updatedQuest = updatedQuestListData.data.quest_list.find(q => q.quest_id === questId);
                                isClaimed = updatedQuest.is_claimed || false;
                            }
        
                            const achievedStatus = isAchieved ? 'Complete' : 'Failure';
                            const claimedStatus = isClaimed ? 'Claim' : 'Not Claim';
        
                            const questNameColor = colors.cyan;
                            const achievedColor = isAchieved ? colors.green : colors.red;
                            const claimedColor = isClaimed ? colors.green : colors.red;
        
                            if (!questName.toLowerCase().includes('bind')) {
                                this.log(`${colors.white(`Do the misson`)} ${questNameColor(questName)}${colors.blue('...')} Status: ${achievedColor(achievedStatus)} | ${claimedColor(claimedStatus)}`);
                            }
                        }
        
                        const progress = questListData.data.progress || '';
                        const isClaimedQuestLottery = questListData.data.is_claimed || false;
        
                        if (isClaimedQuestLottery) {
                            this.log(colors.yellow(`Claim Quest available: ${progress}`));
                            const claimQuestLotteryResponse = await axios.post(`${this.base_url}/claim_quest_lottery`, {}, { headers: this.headers });
                            if (claimQuestLotteryResponse.data.code === 0) {
                                this.log(colors.green('Claim Quest successfully!'));
                            } else {
                                this.log(colors.red('Claim Quest failed!'));
                            }
                        }
        
                    } catch (error) {
                        this.log(colors.red('Error when taking the mission list:' + error.message));
                    }
                } else {
                    this.log(colors.yellow('Ignore on duty!'));
                }
    
            } catch (error) {
                this.log('It is impossible to find user information and the mission list due to the lack of notification code.');
            }
    
            if (isFirstAccount) {
                return remainingTimeMinutes;
            }
        }
        return null;
    } 

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    extractUserData(queryId) {
        const urlParams = new URLSearchParams(queryId);
        const user = JSON.parse(decodeURIComponent(urlParams.get('user')));
        return {
            auth_date: urlParams.get('auth_date'),
            hash: urlParams.get('hash'),
            query_id: urlParams.get('query_id'),
            user: user
        };
    }

    async Countdown(seconds) {
        for (let i = Math.floor(seconds); i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Completed all accounts, waiting ${i} seconds to continue the loop =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }    

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const userData = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
        
        const doQuestsAnswer = await this.askQuestion('Do you want to do the mission?(y/n): ');
        const doQuests = doQuestsAnswer.toLowerCase() === 'y';
        
        while (true) {
            let minRemainingTime = Infinity;
    
            for (let i = 0; i < userData.length; i++) {
                const queryId = userData[i];
                const data = this.extractUserData(queryId);
                const userDetail = data.user;
                
                if (queryId) {
                    console.log(`\n========== Account${i + 1} | ${userDetail.first_name} ==========`);
                    const remainingTime = await this.processAccount(queryId, i === 0, doQuests);
    
                    if (i === 0 && remainingTime !== null) {
                        minRemainingTime = remainingTime;
                    }
                }
                
                await this.sleep(1000); 
            }
    
            if (minRemainingTime < Infinity) {
                const remainingDuration = Duration.fromMillis(minRemainingTime * 60 * 1000);
                const remainingSeconds = remainingDuration.as('seconds');
                await this.Countdown(remainingSeconds); 
            } else {
                await this.Countdown(10 * 60);
            }
        }
    }
}

const bot = new BananaBot();
bot.main();