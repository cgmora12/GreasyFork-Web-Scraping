const webdriver = require('selenium-webdriver');
const {Builder, By} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const fs = require('fs');

chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

async function start() {
	var driver = await new webdriver.Builder()
	            .forBrowser('chrome')
	            .build();

	try {
	    // Navega a la URL
	    await driver.get('https://greasyfork.org/en/scripts');

	    var totalScripts = 0, totalAuthors = 0;
	    var searchNextPage = true;

	    var scriptsHrefs = [], authorsHrefs = [];

	    var writeStreamScripts = fs.createWriteStream('scripts.csv');
		writeStreamScripts.on('finish', () => {
		    console.log('wrote all scripts data to file');
		});
	    var writeStreamAuthors = fs.createWriteStream('authors.csv');
		writeStreamAuthors.on('finish', () => {
		    console.log('wrote all authors data to file');
		});

	    // TODO: activate do while
	    do{
		    var olScripts = await driver.findElement(By.id('browse-script-list'));

		    // Get all the elements available with tag 'li'
		    var liScripts = await olScripts.findElements(By.css('li'));
		    for(var li of liScripts) {
		    	try{
		    		/*var article = await li.findElement(By.css('article'));
		    		var h2 = await article.findElement(By.css('h2'));
		    		var a = await h2.findElement(By.css('a'));
		    		var href = await a.getAttribute('href');*/
		    		var a = await li.findElement(By.css('article')).findElement(By.css('h2')).findElement(By.css('a'));
		    		var href = await a.getAttribute('href');
		    		scriptsHrefs.push(href);
		    		//console.log('href: ' + href);
		        	totalScripts++;
		    		//driver.executeScript('window.open("' + href + '");');


		    		
		    	} catch (e) {
		    		console.log('Error obtaining script url');
		    		console.log(e.name + ': ' + e.message);
		    	}
		    }
		    try{
		    	await driver.findElement(webdriver.By.className('next_page')).click();
			} catch(e){
				searchNextPage = false;
			}

		} while(searchNextPage);

		writeStreamScripts.write('"script name", "total installs", "creation date", "update date", "author", "comments", "versions", "code references DOM by DOM API", "code references DOM by #getElementById", "code references DOM by JQuery", "code references DOM by CSS selector", "code references DOM by XPath"\n', 'utf8');

	    for(var href of scriptsHrefs){

	    	//await a.click();
			try{
	    		await driver.get(href);
				var scriptName = await driver.findElement(By.css('section')).findElement(By.css('header')).findElement(By.css('h2')).getText();
				if(!scriptName.includes('AntiAdware') && !scriptName.includes('WaniKani Pitch Info')/* they freeze the process*/){
					console.log('************ '+ scriptName + ' ******************');

					var textTotalInstalls = '';
					try{
						textTotalInstalls = await driver.findElement(By.css('dd.script-show-total-installs')).findElement(By.css('span')).getText();
					} catch(e){
						console.log(e.name + ': ' + e.message);
					}
					console.log('Total installs: ' + textTotalInstalls);

					var textCreatedDate = '';
					try{
						textCreatedDate = await driver.findElement(By.css('dd.script-show-created-date')).findElement(By.css('span')).findElement(By.css('time')).getText();
					} catch(e){
						console.log(e.name + ': ' + e.message);
					}
					console.log('Created: ' + textCreatedDate);

					var textUpdatedDate = '';
					try{
						textUpdatedDate = await driver.findElement(By.css('dd.script-show-updated-date')).findElement(By.css('span')).findElement(By.css('time')).getText();
					} catch(e){
						console.log(e.name + ': ' + e.message);
					}
					console.log('Updated: ' + textUpdatedDate);

					var authorText = '', linkAuthor = '';
					try{
						var author = await driver.findElement(By.css('dd.script-show-author')).findElement(By.css('span')).findElement(By.css('a'));
						authorText = await author.getText();
						linkAuthor = await author.getAttribute('href');
						if(!authorsHrefs.includes(linkAuthor)){
							authorsHrefs.push(linkAuthor);
						}
					} catch(e){
						console.log(e.name + ': ' + e.message);
					}
					console.log('Author: ' + authorText);

					try{
						var navigationLis = await driver.findElement(By.id('script-links')).findElements(By.css('li'));

						var feedbackText = '';
						try{
							feedbackText = await navigationLis[3].findElement(By.css('a')).findElement(By.css('span')).getText();
							feedbackText = feedbackText.split('Feedback (').join('').split(')').join('');
						} catch(e){
							console.log(e.name + ': ' + e.message);
						}
						console.log('Feedback: ' + feedbackText);

						var versions = '';
						try{
							var historyLink = await navigationLis[2].findElement(By.css('a'));
							await historyLink.click();
							versions = await driver.findElement(By.className('history_versions')).findElements(By.css('li'));
						} catch(e){
							console.log(e.name + ': ' + e.message);
						}
						console.log('Versions: ' + versions.length);

						navigationLis = await driver.findElement(By.id('script-links')).findElements(By.css('li'));
						var codeLink = await navigationLis[1].findElement(By.css('a')); 
						await codeLink.click();

						var code = '';
						try{
							code = await driver.findElement(By.css('pre'/*.prettyprint'*/)).getAttribute("innerText");
						} catch(e){
							console.log(e.name + ': ' + e.message);
						}
						//console.log('Code: ' + code.substring(0, 50));

						var domAPI = false, domAPIgetElementById = false, domJquery = false, domCss = false, domXpath = false;
						if(code.includes('getElementBy')){
							domAPI = true;
							console.log('Code references DOM by DOM API');
							if(code.includes('getElementById')){
								domAPIgetElementById = true;
								console.log('Code references DOM by #getElementById');
							}
						}
						if(code.includes('$(')){
							domJquery = true;
							console.log('Code references DOM by JQuery');
						}
						if(code.includes('querySelector')){
							domCss = true;
							console.log('Code references DOM by CSS selector');
						}
						if(code.includes('XPathResult') && code.includes('document.evaluate')){
							domXpath = true;
							console.log('Code references DOM by XPath');
						}
					} catch(e){
						console.log(e.name + ': ' + e.message);
					}


					writeStreamScripts.write('"' + scriptName + '", "' + textTotalInstalls + '", "' + textCreatedDate + '", "' + textUpdatedDate + '", "' + linkAuthor + '", "' + feedbackText 
						+ '", "' + versions.length + '", "' + domAPI + '", "' + domAPIgetElementById + '", "' + domJquery + '", "' + domCss + '", "' + domXpath + '" \n', 'utf8');
				}
			} catch (e) {
				console.log('Error obtaining script detailed data');
				console.log(e.name + ': ' + e.message);
			} 
	    	//await driver.navigate().back();
	    }
		// close the stream
		writeStreamScripts.end();

	    console.log('Total scripts: ' + totalScripts);

		writeStreamAuthors.write('"authors name", "url", "scripts"\n', 'utf8');

	    for(var authorHref of authorsHrefs){    	
	    	try{
				await driver.get(authorHref);
				var authorScripts = '';
				try{
					authorScripts = await driver.findElement(By.id('user-script-list')).findElements(By.css('li'));
				} catch (e){
					console.log(e.name + ': ' + e.message);
				}
				console.log('Author scripts: ' + authorScripts.length);

				var authorName = '';
				try {
					authorName = await driver.findElement(By.css('section.text-content')).findElement(By.css('h2')).getText();
				} catch(e){
					console.log(e.name + ': ' + e.message);
				}

				writeStreamAuthors.write('"' + authorName + '", "' + authorHref + '", "' + authorScripts.length + '" \n', 'utf8');

				totalAuthors++;
			} catch(e){
				console.log(e.name + ': ' + e.message);
			}
	    }
		// close the stream
		writeStreamAuthors.end();

	    console.log('Total authors: ' + totalAuthors);
	} catch(e){
		console.log('Error in web scraping...');
		console.log(e.name + ': ' + e.message);
	}
	finally {
	    await driver.quit();
	}

	// Retrieve users
	/*try {
	    // Navega a la URL
	    await driver.get('https://greasyfork.org/es/users');

	    var totalUsers = 0;
	    var searchNextPage = true;

	    do{
		    var olUsers = await driver.findElement(By.id('browse-user-list'));

		    // Get all the elements available with tag 'li'
		    var liUsers = await olUsers.findElements(By.css('li'));
		    for(var li of liUsers) {
		    	var userText = await li.getText();
		    	try{
			    	if(userText.includes('-')) {
			    		var wordToRemove = '';
			    		if(userText.includes('scripts')){ 
			    			wordToRemove = 'scripts';
			        	} else if(userText.includes('scripts')){
			        		wordToRemove = 'script';
			        	}

			        	if(wordToRemove != ''){
			        		totalUsers++;
		    				var userTextScripts = userText.split('-')[1].split(wordToRemove)[0].split(' ').join('');
		        			console.log(userTextScripts);
		        		}
			    	}
		    	} catch (e) {

		    	}
		    }
		    try{
		    	await driver.findElement(By.className('next_page')).click();
			} catch(e){
				searchNextPage = false;
			}

		} while(searchNextPage);

	    console.log('Total users: ' + totalUsers);
	} catch(e){
		console.log('Error in web scraping...')
	}
	finally {
	    await driver.quit();
	}*/
}

start();