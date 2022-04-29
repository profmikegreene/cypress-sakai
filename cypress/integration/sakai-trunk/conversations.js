import sakai from '../../fixtures/sakai.json';


Cypress.Commands.add("cke_setData", (element, content) => {
    //https://medium.com/@nickdenardis/getting-cypress-js-to-interact-with-ckeditor-f46eec01132f
    //https://stackoverflow.com/questions/65068660/how-to-add-type-a-text-in-ckeditor-v4-in-cypress-automationor-any-method-to-s
    let editor;
    
    cy.window({timeout:10000})
    .then((win) => {
        editor = Object.values(win.CKEDITOR.instances).filter(instance => instance.id === `cke_${element}`)[0];
        cy.wrap(editor.status).should('eq', 'ready');
    })
    .then(() => {
        editor.setData(content);
        expect(editor.getData()).to.equal(content);
    });

});

const getRandomNumber = (max) => {
    return Math.floor(Math.random() * max);
};

function createTopic (topicConfig){
    
    cy.get('@i18n').then((i18n) => {
        // Click the create topic button
        cy.contains(i18n.create_new).should('be.visible').click();
        cy.contains(i18n.add_a_new_topic).should('be.visible');
            
        // Fill in the topic title
        cy.get('sakai-add-topic input').contains(i18n.summary).type(topicConfig.title);

        
        // Add tags
        if(topicConfig.tags.length > 0){
            topicConfig.tags.forEach((tag, i) => {
                cy.get('#tags-select').select(tag).blur();
                cy.contains(i18n.add_tag).should('be.visible').click();
                cy.get('sakai-add-topic .tag').should((tags) => {
                    // Finds the tag in the desktop and mobile views, hence the *2
                    expect(tags).to.have.length((i+1)*2);
                    expect(tags.eq(i)).to.contain(tag);
                });
            });
        }
        
        // Select the post to visibility
        cy.contains(i18n[topicConfig['post_to']]).should('be.visible').prev().check();
        if(topicConfig.post_to === 'groups'){
            topicConfig.groups.forEach(group => {
                cy.get('sakai-add-topic').contains(group).should('be.visible').children('input').check();
            });
        }
        
        // Set the post options
        cy.contains(i18n.post_options).siblings((options) => {
            
            (topicConfig.options.pinned) ? cy.contains(i18n.pinned).should('be.visible').children('input').check() : null;
            (topicConfig.options.anonymous) ? cy.get('sakai-add-topic').contains(i18n.anonymous).should('be.visible').children('input').check() : null;
            (topicConfig.options.anonymous_posts) ? cy.get('sakai-add-topic').contains(i18n.anonymous_posts).should('be.visible').children('input').check() : null;
        });
        
        // Fill in the topic description
        // cy.wait(2000);
        cy.cke_setData(1, topicConfig.details);
        // cy.wait(1000);
        
        // Create the topic
        if (topicConfig.publish){
            // cy.get('#conv-desktop #button-block input[value="Publish"]').click();
            cy.get('.act').should('be.visible').children('input').contains(i18n.publish).click();
        } else if (topicConfig.draft){
            // cy.get('#conv-desktop #button-block input[value="Save as Draft"]').click();
            cy.get('.act').contains(i18n.save_as_draft).should('be.visible').click();
            cy.get('#conv-desktop #topic-list-topics .topic-summary.selected .topic-summary-title > span').should('have.class', 'draft');
            cy.get('#conv-desktop sakai-topic .topic > div:first-of-type')
            .should('have.class', 'sak-banner-warn')
            .should('contain', sakai.draftLabel);
        }
    });
    
    cy.get('#conv-desktop sakai-topic[topic]').as('topic');
    
    cy.get('#conv-desktop #topic-list-topics .topic-summary.selected .topic-summary-title-wrapper').should('contain', topicConfig.title);
    cy.get('#conv-desktop sakai-topic .topic-title').should('contain', topicConfig.title);
    cy.get('#conv-desktop sakai-topic .topic-message').should('contain', topicConfig.details);
    
    cy.get('#conv-desktop sakai-topic').invoke('attr', 'topic').as('data');
    // then((sakaiTopic) => {
        // cy.wrap(sakaiTopic).should('have.attr', 'topic').then((topic) => {
            verifyTopicState(topicConfig, cy.wrap('@data'));
        // });
        // expect(sakaiTopic[0]).to.have.property('_topic');
        // verifyTopicState(topicConfig, cy.wrap({draft: sakaiTopic[0]._topic.draft}));
        // verifyTopicTags(topicConfig, cy.wrap({tags: sakaiTopic[0]._topic.tags}));
    // });

    (topicConfig.post_to === 'GROUP') ? cy.get('#conv-desktop sakai-topic .sak-banner-warn').should('contain', sakai.postToGroupsWarning) : null;
    (topicConfig.post_to === 'INSTRUCTORS') ? cy.get('#conv-desktop sakai-topic .sak-banner-warn').should('contain', sakai.postToInstructorsWarning) : null;
    (topicConfig.options.pinned) ? cy.get('#conv-desktop sakai-topic .topic-option :nth-child(2)').should('contain', 'UNPIN') : null;
}

function verifyTopicTags(topicConfig){
    cy.get('#conv-desktop sakai-topic .topic-tags .tag').should((tags) =>{
        expect(tags).to.have.length(topicConfig.tags.length)
        topicConfig.tags.forEach(tag => {
                expect(tags).to.contain(tag)
            });
        });
}

function verifyTopicState(config, data){
    if (config.publish){
        cy.get('#conv-desktop #topic-list-topics .topic-summary.selected .topic-summary-title-wrapper').should('contain', config.title);
        // data.draft.should('be.false');
        
    } else if (config.draft){
        cy.get('#conv-desktop #topic-list-topics .topic-summary.selected .topic-summary-title > span').should('have.class', 'draft');
        cy.get('#conv-desktop sakai-topic .topic > div:first-of-type')
            .should('have.class', 'sak-banner-warn')
            .should('contain', sakai.draftLabel);
        // data.draft.should('be.true');
        
    }
}

describe('Conversations', () => {
    let sakaiUrl = 'http://sakai-21.localhost';
    //should figure out how to pass an object to the test
    //containing the options for DRYer code
    let defaultTopicConfig = {
        title: 'Default Title',
        details: 'Default Details',
        tags: [],
        post_to: 'everyone', //everyone, instructors, groups
        options: {
            'pinned': false,
            'anonymous': false,
            'anonymous_posts': false,
        },
        groups: ['SMPL101 Summer 2021'],
        publish: true,
        draft: false,
    };

    before(function(){
        // cy.request({
        //     method: 'POST',
        //     url: `/direct/session.json?_username=admin&_password=admin`, // baseUrl will be prepended to this url
        // });
        // // just to prove we have a session
        // cy.getCookie(`${sakai.cookie}`).should('exist')
        
        // // Create a site with the Conversations tool
        // cy.request({
        //     method: 'POST',
        //     url: '/direct/site.json',
        //     body:{
        //         // id: `${sakai.siteId}`,
        //         id: Date.now(),
        //         type: "course",
        //         title: `${sakai.siteTitle}`,
        //         owner: "instructor",
        //         published: true,
        //     }
        // })
        
        //access when site id known
        // cy.request({
        //     url: `direct/site/${sakai.siteId}/exists.json`
        // });

        // cy.request('/direct/site.json').then((response) => {
        //     // expect(response.status).to.eq(200)
        //     expect(response.body).to.have.property('site_collection')
        //     const sites = response.body.site_collection.filter(site => site.title == sakai.siteTitle);

        //     expect(sites).to.not.be.empty
        //     cy.get(sites).as('sites');
        //     // cy.visit(`/portal/site/${sites[0].entityId}`, {
        //     //     onBeforeLoad: (win) => {
        //     //       win.sessionStorage.clear()
        //     //     }});
        //     cy.request({
        //         method: 'POST',
        //         url: `${sakaiUrl}/sakai-ws/rest/login/login?id=admin&pw=admin`
        //     }).then((response) => {
        //         cy.request({
        //             method: 'GET',
        //             url: `${sakaiUrl}/sakai-ws/rest/sakai/addToolAndPageToSite?sessionid=${response.body}&siteid=${sites[0].entityId}&toolid=sakai.conversations&pagetitle=Conversations&tooltitle=Conversations&pagelayout=0&position=0&popup=false`
        //         });
        //         cy.request({
        //             method: 'GET',
        //             url: `${sakaiUrl}/sakai-ws/rest/sakai/addToolAndPageToSite?sessionid=${response.body}&siteid=${sites[0].entityId}&toolid=sakai.siteinfo&pagetitle=Site%20Info&tooltitle=Site%20Info&pagelayout=0&position=1&popup=false`
        //         })
        //     });
        //   });
    });

    beforeEach(function () {
        // login
        // cy.sakaiLogin(sakai.username);
        cy.clearCookie(`${sakai.cookie}`);

        cy.request({
            method: 'POST',
            url: `/direct/session.json?_username=instructor&_password=sakai`,
        });
        // just to prove we have a session
        cy.getCookie(`${sakai.cookie}`).should('exist');

        // delete any old test sites
        cy.request('/direct/site.json').then((response) => {
            // expect(response.status).to.eq(200)
            expect(response.body).to.have.property('site_collection')
            const sites = response.body.site_collection.filter(site => site.title == sakai.siteTitle);
            if (sites.length > 0 ) {
                sites.forEach(site => {
                    
                    cy.request({
                        method: 'DELETE',
                        url: `/direct/site/${site.entityId}`,
                        body:{ softlyDeleted: false}
                    });
                });
            }
            // cy.visit(`/portal/site/${sites[0].entityId}`, {
                //     onBeforeLoad: (win) => {
                    //       win.sessionStorage.clear()
                    //     }});
                    // cy.request({
                        //     method: 'POST',
                        //     url: `${sakaiUrl}/sakai-ws/rest/login/login?id=admin&pw=admin`
                        // }).then((response) => {
                            // });
                            
                            // cy.request({
                                //     url: `direct/site/${sakai.siteId}/exists.json`,
                                //     failOnStatusCode: false
                                // }).should('have.property', 'status', 404);
                            });
        cy.request('/direct/site.json').then((response) => {
            expect(response.body).to.have.property('site_collection')
            const sites = response.body.site_collection.filter(site => site.title == sakai.siteTitle);
            expect(sites).to.be.empty;
        });
        // Create a site with the Conversations tool
        cy.request({
            method: 'POST',
            url: '/direct/site.json',
            body:{
                // id: `${sakai.siteId}`,
                id: Date.now(),
                type: "course",
                title: `${sakai.siteTitle}`,
                owner: "instructor",
                published: true,
            }
        })
        cy.request('/direct/site.json').then((response) => {
            // expect(response.status).to.eq(200)
            expect(response.body).to.have.property('site_collection')
            const sites = response.body.site_collection.filter(site => site.title == sakai.siteTitle);

            expect(sites).to.not.be.empty
            cy.get(sites).as('sites');
            // cy.visit(`/portal/site/${sites[0].entityId}`, {
            //     onBeforeLoad: (win) => {
            //       win.sessionStorage.clear()
            //     }});
            cy.request({
                method: 'POST',
                url: `${sakaiUrl}/sakai-ws/rest/login/login?id=admin&pw=admin`
            }).then((response) => {
                cy.request({
                    method: 'GET',
                    url: `${sakaiUrl}/sakai-ws/rest/sakai/addToolAndPageToSite?sessionid=${response.body}&siteid=${sites[0].entityId}&toolid=sakai.conversations&pagetitle=Conversations&tooltitle=Conversations&pagelayout=0&position=0&popup=false`
                });
                cy.request({
                    method: 'GET',
                    url: `${sakaiUrl}/sakai-ws/rest/sakai/addToolAndPageToSite?sessionid=${response.body}&siteid=${sites[0].entityId}&toolid=sakai.siteinfo&pagetitle=Site%20Info&tooltitle=Site%20Info&pagelayout=0&position=1&popup=false`
                })
            });
          });

        // cy.request({
        //     url: '/direct/session/becomeuser/instructor.json'
        // }).then((response) => {
        //     expect(response.body).to.include('admin sucessfully became user instructor');
        //     cy.visit('/portal');
        //     // cy.visit(`/portal/site/${sakai.siteId}`, {
        //         // onBeforeLoad: (win) => {
        //         //     win.sessionStorage.clear()
        //         // }});
        // })
        cy.request({
            method: 'POST',
            url: `${sakaiUrl}/sakai-ws/rest/login/login?id=instructor&pw=sakai`
        }).then((loginResponse) => {
            cy.request('/direct/site.json').then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('site_collection')
                const sites = response.body.site_collection.filter(site => site.title == sakai.siteTitle);

                expect(sites).to.not.be.empty
                cy.visit(`/portal/site/${sites[0].entityId}`, {
                    onBeforeLoad: (win) => {
                    win.sessionStorage.clear()
                    }});
            });
        });


        // cy.request('/direct/site.json').as('sites');
        // cy.get('@sites').should((response) => {
        //     if (response.status === 200) {
        //         cy.log('Site data loaded successfully');
        //         // cy.wrap(response.body.site_collection).should('not.be.empty')
        //         // .then((sites) => Cypress._.map(sites, 'htmlShortDescription'))
        //         // .should('include','Cypress Testing');

        //         cy.wrap(response.body)
        //             .its('site_collection')
        //             .should('not.be.empty')
        //             .then((sites) =>
        //                 // from every object in the list, pick the "name" property
        //                 Cypress._.map(sites, (o) => Cypress._.pick(o, 'htmlShortDescription')),
        //             )
        //             .should('deep.include', { htmlShortDescription: 'Cypress Testing' })
        //     } else {
        //         cy.log('Site data failed to load');
        //     }
        // });
        
        //access the Conversations tool
        cy.get('.Mrphs-toolsNav__menuitem--link').contains('Conversations').click();
        cy.window()
            .then((win) => {
                cy.wrap(win.sakai.translations.conversations).as('i18n').its('title').should('exist');
            });
    })
    after(function(){
        // cy.clearCookie(`${sakai.cookie}`);
        // cy.request({
        //     method: 'POST',
        //     url: `/direct/session.json?_username=admin&_password=admin`, // baseUrl will be prepended to this url
        // });
        // just to prove we have a session
        // cy.getCookie(`${sakai.cookie}`).should('exist')
        // cy.wait('@sites')
        cy.request('/direct/site.json').then((response) => {
            // expect(response.status).to.eq(200)
            expect(response.body).to.have.property('site_collection')
            const sites = response.body.site_collection.filter(site => site.title == sakai.siteTitle);

            expect(sites).to.not.be.empty
            // cy.visit(`/portal/site/${sites[0].entityId}`, {
            //     onBeforeLoad: (win) => {
            //       win.sessionStorage.clear()
            //     }});
            cy.request({
                method: 'POST',
                url: `${sakaiUrl}/sakai-ws/rest/login/login?id=admin&pw=admin`
            }).then((response) => {
                sites.forEach(site => {
                    
                    cy.request({
                        method: 'DELETE',
                        url: `/direct/site/${site.entityId}`,
                        body:{ softlyDeleted: false}
                    });
                });
            });

            cy.request({
                url: `direct/site/${sakai.siteId}/exists.json`,
                failOnStatusCode: false
            }).should('have.property', 'status', 404);
        });
    });
    
    it('Access the Conversations tool', () => {
        cy.get('@i18n').then((i18n) => {
            cy.contains(i18n.nothing_selected).should('be.visible')
        });
    });

    it.only('Access the tool settings', () =>{
        cy.get('sakai-conversations #conv-settings-link').click();
        cy.get('sakai-conversations-settings .add-topic-wrapper').first().should("contain", sakai.settingsLabel);
        cy.contains(i18n.general_settings).should('be.visible').siblings().should((settings) => {

        });
    });

    it.only('Update the tool permissions', () =>{
        // Access the tool settings
        cy.get('sakai-conversations #conv-settings-link').click();
        // Access the permissions pages
        cy.get('#conv-desktop #conv-settings a').contains(sakai.permissions).click();
        cy.get('#conv-desktop sakai-permissions label').first().should("contain", sakai.permissionsLabel);
        // Select the permissions
        cy.get('#conv-desktop sakai-permissions .sakai-permission-checkbox[data-role=Instructor]').check();
        cy.get('#conv-desktop sakai-permissions .act input.active').click();
        // Verify the permissions
        cy.get('#conv-desktop #conv-settings a').contains(sakai.permissions).click();
        cy.get('#conv-desktop sakai-permissions .sakai-permission-checkbox[data-role=Instructor]').should('be.checked');
    });

    // Tag management
    it('Error on invalid tag length', () =>{
        let topicConfig = defaultTopicConfig;

    });

    it('Create a tag', () =>{
        let topicConfig = defaultTopicConfig;
        cy.get('sakai-conversations #conv-settings-link').click();

        cy.get('#conv-desktop #conv-settings a').contains(sakai.manageTags).click();
        cy.get('#conv-desktop #conv-content h1').should('contain', sakai.manageTags);

        cy.get('#conv-desktop #tag-creation-field').type(topicConfig.tags[0]);
        cy.get('#conv-desktop .act input.active').click();
        cy.get('.tag-row').should('contain', topicConfig.tags[0]);
    });

    it.only('Create multiple tags', () =>{
        let topicConfig = defaultTopicConfig;
        cy.get('sakai-conversations #conv-settings-link').click();

        cy.get('#conv-desktop #conv-settings a').contains(sakai.manageTags).click();
        cy.get('#conv-desktop #conv-content h1').should('contain', sakai.manageTags);

        cy.get('#conv-desktop #tag-creation-field').type(topicConfig.tags.join(','));
        cy.get('#conv-desktop .act input.active').click();

        topicConfig.tags.forEach(tag => {
            cy.get('.tag-row').should('contain', tag);
        });

    });

    // Topic management
    it('Error on invalid topic data', () =>{
        let topicConfig = defaultTopicConfig;

    });

    it('Create a topic', () =>{
        let topicConfig = defaultTopicConfig;
        createTopic(topicConfig);
    });

    it('Create a topic with tags', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'No Tags';
        topicConfig.details = 'No Tags';
        topicConfig.tags.length = ['Tag1','Tag2','Tag3','Tag4','Tag5']
        createTopic(topicConfig);

    });

    it('Create a topic visible only to Instructors', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Only visible to instructors';
        topicConfig.details = 'Only visible to instructors';
        topicConfig.post_to = 'instructors';
        createTopic(topicConfig);

    });

    it('Create a Topic visible only to members of a group', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Only visible to group';
        topicConfig.details = 'Only visible to group';
        topicConfig.post_to = 'groups';
        createTopic(topicConfig);

    });
    it('Create a Pinned topic', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Pinned topic';
        topicConfig.details = 'Pinned topic';
        topicConfig.options.pinned = true;
        createTopic(topicConfig);

    });

    it('Create an Anonymous topic', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Anonymous topic';
        topicConfig.details = 'Anonymous topic';
        topicConfig.options.anonymous = true;
        createTopic(topicConfig);

    });

    it('Create an Anonymous Posts topic', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Anonymous topic';
        topicConfig.details = 'Anonymous topic';
        topicConfig.options.anonymous_posts = true;
        createTopic(topicConfig);

    });

    it('Create an Anonymous and Anonymous Posts topic', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Anonymous topic and posts';
        topicConfig.details = 'Anonymous topic and posts';
        topicConfig.options.anonymous = true;
        topicConfig.options.anonymous_posts = true;
        createTopic(topicConfig);

    });

    it('Create a Pinned and Anonymous Posts topic', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Pinned and Anonymous posts';
        topicConfig.details = 'Pinned and Anonymous posts';
        topicConfig.options.pinned = true;
        topicConfig.options.anonymous_posts = true;
        createTopic(topicConfig);

    });

    it('Create a Pinned, Anonymous, and Anonymous Posts topic', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Pinned, Anonymous topic and posts';
        topicConfig.details = 'Pinned, Anonymous topic and posts';
        topicConfig.options.pinned = true;
        topicConfig.options.anonymous = true;
        topicConfig.options.anonymous_posts = true;
        createTopic(topicConfig);

    });

    it.only('Create a Pinned, Anonymous, Anonymous Posts to a Group topic', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Pinned, Anonymous topic and posts, Group';
        topicConfig.details = 'Pinned, Anonymous topic and posts, Group';
        topicConfig.options.pinned = true;
        topicConfig.options.anonymous = true;
        topicConfig.options.anonymous_posts = true;
        topicConfig.post_to = 'groups';
        createTopic(topicConfig);

    });

    //needs work so skipping for now
    it.skip('Save topic data upon early exit', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Saved topic data';
        topicConfig.details = 'Saved topic data';
        topicConfig.options.pinned = true;
        topicConfig.options.anonymous = true;
        topicConfig.options.anonymous_posts = true;
        createTopic(topicConfig);

    });

    it('Save a draft', () =>{
        let topicConfig = defaultTopicConfig;
        topicConfig.title = 'Saved draft topic';
        topicConfig.details = 'Saved draft topic';
        topicConfig.publish = false;
        topicConfig.draft = true;
        createTopic(topicConfig);

    });

    //Topic Actions
    //Edit, delete, hide, unhide, lock, unlock, bookmark, unbookmark, pin, unpin


    //Answer Topic
    //Private, Public

    //Answer Actions
    //Edit, delete, hide, unhide, lock, unlock

    //Comments
    //Edit, delete

    //View Changers
    //Tag, Filters, Setting
});