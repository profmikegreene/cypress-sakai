import sakai from '../../fixtures/sakai.json';

const getRandomNumber = (max) => {
    return Math.floor(Math.random() * max);
};

function createTopic (topicConfig){
    cy.get('.Mrphs-toolsNav__menuitem--link').contains('Conversations').click();
    cy.get('#conv-desktop #conv-settings-and-create')
        .should('be.visible')
        .find('a').contains('Create new topic')
        .click();
        // cy.get('#conv-desktop #conv-settings-and-create > a').click();
        cy.get('#conv-desktop sakai-add-topic h1').should('contain', 'Add a New Topic');
        
        
    cy.get('#conv-desktop #summary').clear().type(topicConfig.title);
    // cy.get('#conv-desktop iframe.cke_wysiwyg_frame.cke_reset').focus().type(topicConfig.details);

    //https://stackoverflow.com/questions/65068660/how-to-add-type-a-text-in-ckeditor-v4-in-cypress-automationor-any-method-to-s
    cy.getIframeBody('#conv-desktop #topic-details-editor iframe.cke_wysiwyg_frame')
        .then($frameWindow => {
    
            const win = cy.state('window'); // grab the window Cypress is testing
            const ckEditor = win.CKEDITOR;  // CKEditor has added itself to the window
            const instances = ckEditor.instances;  // can be multiple editors on the page
    
            const myEditor = Object.values(instances)
                .filter(instance => instance.id === 'cke_1')[0]; // select the instance by id
    
            // use CKEditor API to change the text
            myEditor.setData(topicConfig.details); 
        })
    cy.get('#conv-desktop #summary').focus();
    cy.get('#conv-desktop sakai-editor > div').should('contain', topicConfig.details);

    if(topicConfig.tags.length > 0){
        cy.get('#conv-desktop #tag-post-block select')
            .select(topicConfig.tags);
        cy.get('#conv-desktop #tag-post-block input[value="Add"]').click();
        cy.get('#conv-desktop #tag-post-block #tags .tag > div')
            .should('contain', topicConfig.tags);
        }
    cy.get(`#conv-desktop input[data-visibility="${topicConfig.post_to}"]`).check();
    if(topicConfig.post_to === 'GROUP'){
        topicConfig.groups.forEach(group => {
            cy.get('#conv-desktop #add-topic-groups-block .add-topic-group-block').contains(group).find('input').check();
        });
    }
    (topicConfig.options.pinned) ? cy.get('#conv-desktop #pinned-checkbox').check() : null;
    (topicConfig.options.anonymous) ? cy.get('#conv-desktop #anonymous-checkbox').check() : null;
    (topicConfig.options.anonymous_comments) ? cy.get('#conv-desktop #anonymous-comments-checkbox').check() : null;

    if (topicConfig.publish){
        cy.get('#conv-desktop #button-block input[value="Publish"]').click();
    } else if (topicConfig.draft){
        cy.get('#conv-desktop #button-block input[value="Save as Draft"]').click();
        cy.get('#conv-desktop #topic-list-topics .topic-summary.selected .topic-summary-title > span').should('have.class', 'draft');
        cy.get('#conv-desktop sakai-topic .topic > div:first-of-type')
            .should('have.class', 'sak-banner-warn')
            .should('contain', sakai.draftLabel);

    }
    cy.get('#conv-desktop #topic-list-topics .topic-summary.selected .topic-summary-title-wrapper').should('contain', topicConfig.title);
    cy.get('#conv-desktop sakai-topic .topic-title').should('contain', topicConfig.title);
    cy.get('#conv-desktop sakai-topic .topic-message').should('contain', topicConfig.details);
}

describe('Conversations', () => {
    let sakaiUrl;
    sakaiUrl = 'http://sakai.localhost/portal/site/8bfe322c-cd4b-4203-94ee-1bafdc16a42d';
    
        //should figure out how to pass an object to the test
    //containing the options for DRYer code
    let defaultTopicConfig = {
        title: 'Default Title',
        details: 'Default Details',
        tags: [`Tag${getRandomNumber(1000)}`],
        post_to: 'SITE', //SITE, INSTRUCTORS, GROUP
        options: {
            'pinned': false,
            'anonymous': false,
            'anonymous_comments': false,
        },
        groups: ['SMPL101 Summer 2021'],
        publish: true,
        draft: false,
    };

    beforeEach(function () {
        // login before each test
        cy.sakaiLogin(sakai.username)
    })

    it.skip('Create a new course site', function() {
        // cy.sakaiLogin(sakai.username);
        cy.sakaiCreateCourse(sakai.username,[
            "sakai\\.conversations"
        ]).then(url => sakaiUrl = url);
    });

    it('Access the course site', () =>{
        cy.visit(sakaiUrl);
        cy.get('.Mrphs-toolsNav__menuitem--link').contains('Announcements').click();
        cy.get('.portletBody .navIntraTool li:last-of-type a').contains('Permissions').click();
        cy.get('sakai-permissions label').should('contain', sakai.permissionsLabel);
        cy.get('a.Mrphs-hierarchy--toolName').click();
    });
    it('Access the Conversations tool', () =>{
        cy.visit(sakaiUrl);
        cy.get('.Mrphs-toolsNav__menuitem--link').contains('Conversations').click();
        cy.get('#topic-list-topics').should('be.visible');
    });

    it('Access the tool settings', () =>{
        cy.visit(sakaiUrl);
        cy.get('.Mrphs-toolsNav__menuitem--link').contains('Conversations').click();
        cy.get('sakai-conversations #conv-settings-link').click();
        cy.get('sakai-conversations-settings .add-topic-wrapper').first({ timeout: 500 }).should("contain", sakai.settingsLabel);
    });

    it('Access the tool permissions', () =>{
        cy.visit(sakaiUrl);
        cy.get('.Mrphs-toolsNav__menuitem--link').contains('Conversations').click();
        cy.get('sakai-conversations #conv-settings-link').click();
        cy.get('#conv-desktop #conv-permissions a').click();
        cy.get('#conv-desktop sakai-permissions label').first({ timeout: 500 }).should("contain", sakai.permissionsLabel);

    });
    it('Update the tool permissions', () =>{
        cy.visit(sakaiUrl);
        cy.get('.Mrphs-toolsNav__menuitem--link').contains('Conversations').click();
        cy.get('#conv-desktop sakai-topic-list').should('be.visible');

        cy.get('sakai-conversations #conv-settings-link').click();
        cy.get('#conv-desktop #conv-permissions a').click();
        cy.get('#conv-desktop sakai-permissions .sakai-permission-checkbox[data-role=Instructor]').check();
        cy.get('#conv-desktop sakai-permissions .act input.active').click();
        cy.get('#conv-desktop #conv-permissions a').click();
        cy.get('#conv-desktop sakai-permissions .sakai-permission-checkbox[data-role=Instructor]').should('be.checked');
    });

    // Tag management
    it('Error on invalid tag data', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);

    });

    it.only('Create a tag', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        cy.get('.Mrphs-toolsNav__menuitem--link').contains('Conversations').click();
        cy.get('sakai-conversations #conv-settings-link').click();

        cy.get('#conv-desktop #conv-settings a').contains('Manage Tags').click();
        cy.get('#conv-desktop #conv-content h1').should('contain', 'Manage Tags');

        cy.get('#conv-desktop #tag-creation-field').type(topicConfig.tags[0]);
        cy.get('#conv-desktop .act input.active').click();
        cy.get('.tag-row').should('contain', topicConfig.tags[0]);
    });

    it('Create multiple tags', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);

    });

    it('Error on invalid topic data', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);

    });

    //Standard topic test with least amount of options
    //for re-use and every combination of options added
    //in later tests


    it('Create a topic', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        createTopic(topicConfig);
    });

    it('Create a topic without tags', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        topicConfig.title = 'No Tags';
        topicConfig.tags.length = 0;
        createTopic(topicConfig);

    });

    it('Create a topic visible only to Instructors', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        topicConfig.title = 'Only visible to instructors';
        topicConfig.details = 'Only visible to instructors';
        topicConfig.post_to = 'INSTRUCTORS';
        createTopic(topicConfig);

    });

    it('Create a Topic visible only to members of a group', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        topicConfig.title = 'Only visible to group';
        topicConfig.details = 'Only visible to group';
        topicConfig.post_to = 'GROUP';
        createTopic(topicConfig);

    });
    it('Create a Pinned topic', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        topicConfig.title = 'Pinned topic';
        topicConfig.details = 'Pinned topic';
        topicConfig.options.pinned = true;
        createTopic(topicConfig);

    });

    it('Create an Anonymous topic', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        topicConfig.title = 'Anonymous topic';
        topicConfig.details = 'Anonymous topic';
        topicConfig.options.anonymous = true;
        createTopic(topicConfig);

    });

    it('Create an Anonymous Comments topic', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        topicConfig.title = 'Anonymous topic';
        topicConfig.details = 'Anonymous topic';
        topicConfig.options.anonymous_comments = true;
        createTopic(topicConfig);

    });

    it('Create an Anonymous and Anonymous Comments topic', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        topicConfig.title = 'Anonymous topic and comments';
        topicConfig.details = 'Anonymous topic and comments';
        topicConfig.options.anonymous = true;
        topicConfig.options.anonymous_comments = true;
        createTopic(topicConfig);

    });
    it('Create a Pinned, Anonymous, and Anonymous Comments topic', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        topicConfig.title = 'Pinned, Anonymous topic and comments';
        topicConfig.details = 'Pinned, Anonymous topic and comments';
        topicConfig.options.pinned = true;
        topicConfig.options.anonymous = true;
        topicConfig.options.anonymous_comments = true;
        createTopic(topicConfig);

    });

    //needs work so skipping for now
    it.skip('Save topic data upon early exit', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
        topicConfig.title = 'Saved topic data';
        topicConfig.details = 'Saved topic data';
        topicConfig.options.pinned = true;
        topicConfig.options.anonymous = true;
        topicConfig.options.anonymous_comments = true;
        createTopic(topicConfig);

    });

    it('Save a draft', () =>{
        let topicConfig = defaultTopicConfig;
        cy.visit(sakaiUrl);
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