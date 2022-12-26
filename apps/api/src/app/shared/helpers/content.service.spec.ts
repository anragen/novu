import { expect } from 'chai';
import { StepTypeEnum } from '@novu/shared';
import { ContentService } from './content.service';
import { INotificationTemplateStep } from '@novu/shared';

describe('ContentService', function () {
  describe('replaceVariables', function () {
    it('should replace duplicates entries', function () {
      const variables = {
        firstName: 'Name',
        lastName: 'Last Name',
      };

      const contentService = new ContentService();
      const modified = contentService.replaceVariables(
        '{{firstName}} is the first {{firstName}} of {{firstName}}',
        variables
      );
      expect(modified).to.equal('Name is the first Name of Name');
    });

    it('should replace multiple variables', function () {
      const variables = {
        firstName: 'Name',
        $last_name: 'Last Name',
      };

      const contentService = new ContentService();
      const modified = contentService.replaceVariables(
        '{{firstName}} is the first {{$last_name}} of {{firstName}}',
        variables
      );
      expect(modified).to.equal('Name is the first Last Name of Name');
    });

    it('should not manipulate variables for text without them', function () {
      const variables = {
        firstName: 'Name',
        lastName: 'Last Name',
      };

      const contentService = new ContentService();
      const modified = contentService.replaceVariables('This is a text without variables', variables);
      expect(modified).to.equal('This is a text without variables');
    });
  });

  describe('extractVariables', function () {
    it('should not find any variables', function () {
      const contentService = new ContentService();
      try {
        contentService.extractVariables('This is a text without variables {{ invalid }} {{ not valid{ {var}}');
        expect(true).to.equal(false);
      } catch (e) {
        expect(e.response.message).to.equal('Failed to extract variables');
      }
    });

    it('should extract all valid variables', function () {
      const contentService = new ContentService();
      const extractVariables = contentService.extractVariables(
        ' {{name}} d {{lastName}} dd {{_validName}} {{not valid}} aa {{0notValid}}tr {{organization_name}}'
      );
      const variablesNames = extractVariables.map((variable) => variable.name);

      expect(extractVariables.length).to.equal(4);
      expect(variablesNames).to.include('_validName');
      expect(variablesNames).to.include('lastName');
      expect(variablesNames).to.include('name');
      expect(variablesNames).to.include('organization_name');
    });

    it('should correctly extract variables related to registered handlebar helpers', function () {
      const contentService = new ContentService();
      const extractVariables = contentService.extractVariables(' {{titlecase word}}');

      expect(extractVariables.length).to.equal(1);
      expect(extractVariables[0].name).to.include('word');
    });

    it('should not extract variables reserved for the system', function () {
      const contentService = new ContentService();
      const extractVariables = contentService.extractVariables(' {{subscriber.firstName}} {{lastName}}');

      expect(extractVariables.length).to.equal(1);
      expect(extractVariables[0].name).to.include('lastName');
    });

    it('should not show @data variables ', function () {
      const contentService = new ContentService();
      const extractVariables = contentService.extractVariables(
        ' {{#each array}} {{@index}} {{#if @first}} First {{/if}} {{name}} {{/each}}'
      );

      expect(extractVariables.length).to.equal(2);
      expect(extractVariables[0].name).to.include('array');
      expect(extractVariables[0].type).to.eq('Array');
      expect(extractVariables[1].name).to.include('name');
    });
  });

  describe('extractMessageVariables', function () {
    it('should not extract variables', function () {
      const contentService = new ContentService();
      const variables = contentService.extractMessageVariables([
        {
          template: {
            type: StepTypeEnum.IN_APP,
            subject: 'Test',
            content: 'Text',
          },
        },
      ]);
      expect(variables.length).to.equal(0);
    });

    it('should extract subject variables', function () {
      const contentService = new ContentService();
      const variables = contentService.extractMessageVariables([
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{firstName}}',
            content: [],
          },
        },
      ]);
      expect(variables.length).to.equal(1);
      expect(variables[0].name).to.include('firstName');
    });

    it('should add $phone when SMS channel Exists', function () {
      const contentService = new ContentService();
      const variables = contentService.extractSubscriberMessageVariables([
        {
          template: {
            type: StepTypeEnum.IN_APP,
            subject: 'Test',
            content: 'Text',
          },
        },
        {
          template: {
            type: StepTypeEnum.SMS,
            content: 'Text',
          },
        },
      ]);
      expect(variables.length).to.equal(1);
      expect(variables[0]).to.equal('phone');
    });

    it('should add $email when EMAIL channel Exists', function () {
      const contentService = new ContentService();
      const variables = contentService.extractSubscriberMessageVariables([
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test',
            content: 'Text',
          },
        },
        {
          template: {
            type: StepTypeEnum.IN_APP,
            content: 'Text',
          },
        },
      ]);
      expect(variables.length).to.equal(1);
      expect(variables[0]).to.equal('email');
    });

    it('should extract email content variables', function () {
      const contentService = new ContentService();
      const messages = [
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{firstName}}',
            content: [
              {
                content: 'Test of {{lastName}}',
                type: 'text',
              },
              {
                content: 'Test of {{lastName}}',
                type: 'text',
                url: 'Test of {{url}}',
              },
            ],
          },
        },
        {
          template: {
            type: StepTypeEnum.EMAIL,
            subject: 'Test {{email}}',
            content: [
              {
                content: 'Test of {{lastName}}',
                type: 'text',
              },
              {
                content: 'Test of {{lastName}}',
                type: 'text',
                url: 'Test of {{url}}',
              },
            ],
          },
        },
      ] as INotificationTemplateStep[];

      const variables = contentService.extractMessageVariables(messages);
      const subscriberVariables = contentService.extractSubscriberMessageVariables(messages);
      const variablesNames = variables.map((variable) => variable.name);

      expect(variables.length).to.equal(4);
      expect(subscriberVariables.length).to.equal(1);
      expect(variablesNames).to.include('lastName');
      expect(variablesNames).to.include('url');
      expect(variablesNames).to.include('firstName');
      expect(subscriberVariables).to.include('email');
    });

    it('should extract in-app content variables', function () {
      const contentService = new ContentService();
      const variables = contentService.extractMessageVariables([
        {
          template: {
            type: StepTypeEnum.IN_APP,
            content: '{{customVariables}}',
          },
        },
      ]);

      expect(variables.length).to.equal(1);
      expect(variables[0].name).to.include('customVariables');
    });
  });
});
